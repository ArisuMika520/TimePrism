import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const archiveBucketEnum = z.enum(["FINISHED", "UNFINISHED"])

const updateTodoSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["WAIT", "IN_PROGRESS", "COMPLETE"]).optional(),
  customStatusId: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  category: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  startDate: z.string().datetime().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  todayPinnedDate: z.string().datetime().optional().nullable(),
  links: z.array(z.string().url()).optional(),
  taskId: z.string().optional().nullable(),
  archivedAt: z.string().datetime().optional().nullable(),
  archivedBucket: archiveBucketEnum.optional().nullable(),
  archivedReason: z.string().max(500).optional().nullable(),
  archivedBySystem: z.boolean().optional(),
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

    const todo = await prisma.todo.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
      include: {
        attachments: true,
        customStatus: true,
        task: true,
      },
    })

    if (!todo) {
      return NextResponse.json({ error: "待办事项不存在" }, { status: 404 })
    }

    return NextResponse.json(todo)
  } catch (error) {
    return NextResponse.json(
      { error: "获取待办事项失败" },
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
    const data = updateTodoSchema.parse(body)

    const todo = await prisma.todo.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    })

    if (!todo) {
      return NextResponse.json({ error: "待办事项不存在" }, { status: 404 })
    }

    const updateData: any = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.status !== undefined) updateData.status = data.status
    if (data.customStatusId !== undefined) updateData.customStatusId = data.customStatusId || null
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.category !== undefined) updateData.category = data.category
    if (data.tags !== undefined) updateData.tags = data.tags
    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate ? new Date(data.startDate) : null
    }
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null
    }
    if (data.todayPinnedDate !== undefined) {
      updateData.todayPinnedDate = data.todayPinnedDate ? new Date(data.todayPinnedDate) : null
    }
    if (data.links !== undefined) updateData.links = data.links
    if (data.taskId !== undefined) {
      // 如果提供了taskId，验证Task属于当前用户
      if (data.taskId) {
        const task = await prisma.task.findFirst({
          where: {
            id: data.taskId,
            userId: session.user.id,
          },
        })
        if (!task) {
          return NextResponse.json({ error: "任务不存在" }, { status: 404 })
        }
      }
      updateData.taskId = data.taskId || null
    }
    if (data.archivedAt !== undefined) {
      updateData.archivedAt = data.archivedAt ? new Date(data.archivedAt) : null
    }
    if (data.archivedBucket !== undefined) {
      updateData.archivedBucket = data.archivedBucket || null
    }
    if (data.archivedReason !== undefined) {
      updateData.archivedReason = data.archivedReason || null
    }
    if (data.archivedBySystem !== undefined) {
      updateData.archivedBySystem = data.archivedBySystem
    }

    const updatedTodo = await prisma.todo.update({
      where: { id: id },
      data: updateData,
      include: {
        attachments: true,
        customStatus: true,
        task: true,
      },
    })

    // 如果Todo状态改变且有关联的Task，自动更新Task进度
    if (data.status !== undefined && updatedTodo.taskId) {
      try {
        const task = await prisma.task.findUnique({
          where: { id: updatedTodo.taskId },
          include: {
            todos: true,
          },
        })

        if (task) {
          const totalTodos = task.todos.length
          const completedTodos = task.todos.filter(
            (todo) => todo.status === "COMPLETE"
          ).length
          const progressPercentage =
            totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0

          // 如果所有Todo都完成，自动将Task状态改为COMPLETE
          const newStatus =
            completedTodos === totalTodos && totalTodos > 0
              ? "COMPLETE"
              : task.status

          await prisma.task.update({
            where: { id: task.id },
            data: {
              status: newStatus,
            },
          })
        }
      } catch (error) {
      }
    }

    return NextResponse.json(updatedTodo)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "更新待办事项失败" },
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

    const todo = await prisma.todo.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    })

    if (!todo) {
      return NextResponse.json({ error: "待办事项不存在" }, { status: 404 })
    }

    await prisma.todo.delete({
      where: { id: id },
    })

    return NextResponse.json({ message: "删除成功" })
  } catch (error) {
    return NextResponse.json(
      { error: "删除待办事项失败" },
      { status: 500 }
    )
  }
}

