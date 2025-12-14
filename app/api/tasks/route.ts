import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const taskSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  description: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  status: z.enum(["TODO", "IN_PROGRESS", "COMPLETE"]).default("TODO"),
  customStatusId: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).default([]),
  position: z.number().default(0),
  taskListId: z.string(),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const data = taskSchema.parse(body)

    const taskList = await prisma.taskList.findFirst({
      where: {
        id: data.taskListId,
        userId: session.user.id,
      },
    })

    if (!taskList) {
      return NextResponse.json({ error: "任务列表不存在" }, { status: 404 })
    }

    if (data.customStatusId) {
      const customStatus = await prisma.projectCustomStatus.findFirst({
        where: {
          id: data.customStatusId,
          userId: session.user.id,
        },
      })
      if (!customStatus) {
        return NextResponse.json({ error: "自定义状态不存在" }, { status: 404 })
      }
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        status: data.status,
        customStatusId: data.customStatusId || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        tags: data.tags,
        position: data.position,
        taskListId: data.taskListId,
        userId: session.user.id,
      },
      include: {
        attachments: true,
        todos: true,
        customStatus: true,
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "创建任务失败" },
      { status: 500 }
    )
  }
}

