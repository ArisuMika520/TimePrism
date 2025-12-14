import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "COMPLETE"]).optional(),
  customStatusId: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).optional(),
  position: z.number().optional(),
  taskListId: z.string().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const task = await prisma.task.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
      include: {
        attachments: true,
        taskList: true,
        todos: true,
        customStatus: true,
      },
    })

    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    return NextResponse.json(
      { error: "获取任务失败" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const data = updateTaskSchema.parse(body)

    const task = await prisma.task.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    })

    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 })
    }

    if (data.taskListId && data.taskListId !== task.taskListId) {
      const newTaskList = await prisma.taskList.findFirst({
        where: {
          id: data.taskListId,
          userId: session.user.id,
        },
      })

      if (!newTaskList) {
        return NextResponse.json({ error: "任务列表不存在" }, { status: 404 })
      }
    }

    if (data.customStatusId !== undefined) {
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
    }

    const updatedTask = await prisma.task.update({
      where: { id: id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.customStatusId !== undefined && { customStatusId: data.customStatusId || null }),
        ...(data.dueDate !== undefined && {
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
        }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.position !== undefined && { position: data.position }),
        ...(data.taskListId !== undefined && { taskListId: data.taskListId }),
      },
      include: {
        attachments: true,
        taskList: true,
        todos: true,
        customStatus: true,
      },
    })

    return NextResponse.json(updatedTask)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "更新任务失败" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const task = await prisma.task.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    })

    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 })
    }

    await prisma.task.delete({
      where: { id: id },
    })

    return NextResponse.json({ message: "删除成功" })
  } catch (error) {
    return NextResponse.json(
      { error: "删除任务失败" },
      { status: 500 }
    )
  }
}

