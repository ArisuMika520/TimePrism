import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const taskListSchema = z.object({
  name: z.string().min(1, "名称不能为空"),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  position: z.number().default(0),
  projectId: z.string().optional().nullable(),
})

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const url = new URL(request.url)
    const projectId = url.searchParams.get("projectId")

    const where: any = { userId: session.user.id }
    if (projectId) {
      where.projectId = projectId
    }

    const taskLists = await prisma.taskList.findMany({
      where,
      include: {
        tasks: {
          orderBy: { position: "asc" },
          include: {
            attachments: true,
            todos: true,
            customStatus: true,
          },
        },
        project: true,
      },
      orderBy: { position: "asc" },
    })

    return NextResponse.json(taskLists)
  } catch (error) {
    return NextResponse.json(
      { error: "获取任务列表失败" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const data = taskListSchema.parse(body)

    if (data.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: data.projectId,
          userId: session.user.id,
        },
      })
      if (!project) {
        return NextResponse.json({ error: "项目不存在" }, { status: 404 })
      }
    }

    const taskList = await prisma.taskList.create({
      data: {
        name: data.name,
        description: data.description || null,
        color: data.color || null,
        position: data.position,
        projectId: data.projectId || null,
        userId: session.user.id,
      },
      include: {
        tasks: true,
        project: true,
      },
    })

    return NextResponse.json(taskList, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "创建任务列表失败" },
      { status: 500 }
    )
  }
}

