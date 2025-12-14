import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const moveTaskSchema = z.object({
  taskId: z.string(),
  newListId: z.string(),
  newPosition: z.number(),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const { taskId, newListId, newPosition } = moveTaskSchema.parse(body)

    // 验证任务和列表都属于当前用户
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: session.user.id,
      },
    })

    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 })
    }

    const newTaskList = await prisma.taskList.findFirst({
      where: {
        id: newListId,
        userId: session.user.id,
      },
    })

    if (!newTaskList) {
      return NextResponse.json({ error: "任务列表不存在" }, { status: 404 })
    }

    // 如果移动到不同的列表，需要更新其他任务的位置
    if (task.taskListId !== newListId) {
      await prisma.task.updateMany({
        where: {
          taskListId: task.taskListId,
          position: { gt: task.position },
        },
        data: {
          position: { decrement: 1 },
        },
      })

      await prisma.task.updateMany({
        where: {
          taskListId: newListId,
          position: { gte: newPosition },
        },
        data: {
          position: { increment: 1 },
        },
      })
    } else {
      if (task.position < newPosition) {
        await prisma.task.updateMany({
          where: {
            taskListId: newListId,
            position: { gt: task.position, lte: newPosition },
          },
          data: {
            position: { decrement: 1 },
          },
        })
      } else {
        await prisma.task.updateMany({
          where: {
            taskListId: newListId,
            position: { gte: newPosition, lt: task.position },
          },
          data: {
            position: { increment: 1 },
          },
        })
      }
    }

    // 根据目标列表的名称自动更新任务状态
    let newStatus = task.status
    const listName = newTaskList.name.toUpperCase()
    if (listName === "TODO") {
      newStatus = "TODO"
    } else if (listName === "IN PROGRESS" || listName === "IN_PROGRESS") {
      newStatus = "IN_PROGRESS"
    } else if (listName === "COMPLETE" || listName === "COMPLETED") {
      newStatus = "COMPLETE"
    }

    // 更新任务
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        taskListId: newListId,
        position: newPosition,
        status: newStatus,
      },
      include: {
        attachments: true,
        taskList: true,
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
      { error: "移动任务失败" },
      { status: 500 }
    )
  }
}

