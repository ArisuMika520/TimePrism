import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { Prisma } from "@prisma/client"
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

const updateViewSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  filters: viewFiltersSchema.optional(),
  sort: sortSchema,
})

const paramsSchema = z.object({
  id: z.string(),
})

const ensureOwnership = async (userId: string, viewId: string) => {
  return prisma.savedTodoView.findFirst({
    where: { id: viewId, userId },
  })
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const params = await context.params
    const { id } = paramsSchema.parse(params)

    const view = await ensureOwnership(session.user.id, id)
    if (!view) {
      return NextResponse.json({ error: "视图不存在" }, { status: 404 })
    }

    return NextResponse.json(view)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "获取视图失败" }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const params = await context.params
    const { id } = paramsSchema.parse(params)
    const body = await request.json()
    const data = updateViewSchema.parse(body)

    const existingView = await ensureOwnership(session.user.id, id)
    if (!existingView) {
      return NextResponse.json({ error: "视图不存在" }, { status: 404 })
    }

    if (data.name && data.name !== existingView.name) {
      const duplicate = await prisma.savedTodoView.findFirst({
        where: {
          userId: session.user.id,
          name: data.name,
          NOT: { id },
        },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: "同名视图已存在，请使用其他名称" },
          { status: 409 }
        )
      }
    }

    const updated = await prisma.savedTodoView.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.filters ? { filters: data.filters as Prisma.InputJsonValue } : {}),
        ...(data.sort !== undefined ? { sort: data.sort === null ? Prisma.JsonNull : data.sort as Prisma.InputJsonValue } : {}),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "更新视图失败" }, { status: 500 })
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const params = await context.params
    const { id } = paramsSchema.parse(params)

    const existingView = await ensureOwnership(session.user.id, id)
    if (!existingView) {
      return NextResponse.json({ error: "视图不存在" }, { status: 404 })
    }

    await prisma.savedTodoView.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "删除视图失败" }, { status: 500 })
  }
}



