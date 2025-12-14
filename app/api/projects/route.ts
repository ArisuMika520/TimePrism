import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const projectSchema = z.object({
  name: z.string().min(1, "项目名称不能为空"),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  position: z.number().default(0),
})

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      include: {
        taskLists: {
          include: {
            tasks: {
              orderBy: { position: "asc" },
              include: {
                attachments: true,
                todos: true,
              },
            },
          },
          orderBy: { position: "asc" },
        },
      },
      orderBy: { position: "asc" },
    })

    return NextResponse.json(projects)
  } catch (error) {
    return NextResponse.json(
      { error: "获取项目列表失败" },
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
    const data = projectSchema.parse(body)

    // 当前最大 position
    const maxPosition = await prisma.project.findFirst({
      where: { userId: session.user.id },
      orderBy: { position: "desc" },
      select: { position: true },
    })

    // 创建项目并初始化默认的3个TaskList，设置默认颜色
    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description || null,
        color: data.color || null,
        position: (maxPosition?.position ?? -1) + 1,
        userId: session.user.id,
        taskLists: {
          create: [
            {
              name: "TODO",
              description: "待办任务",
              color: "#6b7280", // 灰色
              position: 0,
              userId: session.user.id,
            },
            {
              name: "IN PROGRESS",
              description: "进行中",
              color: "#2563eb", // 蓝色
              position: 1,
              userId: session.user.id,
            },
            {
              name: "COMPLETE",
              description: "已完成",
              color: "#10b981", // 绿色
              position: 2,
              userId: session.user.id,
            },
          ],
        },
      },
      include: {
        taskLists: {
          include: {
            tasks: {
              orderBy: { position: "asc" },
              include: {
                attachments: true,
                todos: true,
              },
            },
          },
          orderBy: { position: "asc" },
        },
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "创建项目失败" },
      { status: 500 }
    )
  }
}

