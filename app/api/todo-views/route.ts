import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const todoStatusEnum = z.enum(["WAIT", "IN_PROGRESS", "COMPLETE"])
const priorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"])

const viewFiltersSchema = z.object({
  statuses: z.array(todoStatusEnum).optional(),
  priorities: z.array(priorityEnum).optional(),
  customStatusIds: z.array(z.string()).optional(),
  dueFrom: z.string().datetime().optional().nullable(),
  dueTo: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).optional(),
  query: z.string().optional().nullable(),
  viewMode: z.enum(["today", "current", "archive"]).optional(),
})

const sortSchema = z
  .object({
    field: z.string(),
    direction: z.enum(["asc", "desc"]).default("asc"),
  })
  .optional()
  .nullable()

const createViewSchema = z.object({
  name: z.string().min(1).max(100),
  filters: viewFiltersSchema.default({}),
  sort: sortSchema,
})

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const views = await prisma.savedTodoView.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json(views)
  } catch (error) {
    return NextResponse.json({ error: "获取视图失败" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const data = createViewSchema.parse(body)

    const existing = await prisma.savedTodoView.findFirst({
      where: { userId: session.user.id, name: data.name },
    })

    if (existing) {
      return NextResponse.json(
        { error: "同名视图已存在，请使用其他名称" },
        { status: 409 }
      )
    }

    const view = await prisma.savedTodoView.create({
      data: {
        name: data.name,
        filters: data.filters ?? {},
        sort: data.sort ?? null,
        userId: session.user.id,
      },
    })

    return NextResponse.json(view, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "创建视图失败" }, { status: 500 })
  }
}



