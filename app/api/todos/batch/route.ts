import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const batchUpdateSchema = z.object({
  todoIds: z.array(z.string()).min(1, "至少选择一个待办事项"),
  updates: z.object({
    status: z.enum(["WAIT", "IN_PROGRESS", "COMPLETE"]).optional(),
    customStatusId: z.string().optional().nullable(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    tags: z.array(z.string()).optional(),
    todayPinnedDate: z.string().datetime().optional().nullable(),
    dueDate: z.string().datetime().optional().nullable(),
  }),
})

const batchDeleteSchema = z.object({
  todoIds: z.array(z.string()).min(1, "至少选择一个待办事项"),
})

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const data = batchUpdateSchema.parse(body)

    const todos = await prisma.todo.findMany({
      where: {
        id: { in: data.todoIds },
        userId: session.user.id,
      },
    })

    if (todos.length !== data.todoIds.length) {
      return NextResponse.json(
        { error: "部分待办事项不存在或无权限" },
        { status: 403 }
      )
    }

    const updateData: any = {}
    if (data.updates.status !== undefined) {
      updateData.status = data.updates.status
    }
    if (data.updates.customStatusId !== undefined) {
      updateData.customStatusId = data.updates.customStatusId || null
    }
    if (data.updates.priority !== undefined) {
      updateData.priority = data.updates.priority
    }
    if (data.updates.tags !== undefined) {
      updateData.tags = data.updates.tags
    }
    if (data.updates.todayPinnedDate !== undefined) {
      updateData.todayPinnedDate = data.updates.todayPinnedDate
        ? new Date(data.updates.todayPinnedDate)
        : null
    }
    if (data.updates.dueDate !== undefined) {
      updateData.dueDate = data.updates.dueDate ? new Date(data.updates.dueDate) : null
    }

    const result = await prisma.todo.updateMany({
      where: {
        id: { in: data.todoIds },
        userId: session.user.id,
      },
      data: updateData,
    })

    const updatedTodos = await prisma.todo.findMany({
      where: {
        id: { in: data.todoIds },
        userId: session.user.id,
      },
      include: {
        attachments: true,
        customStatus: true,
      },
    })

    return NextResponse.json({
      message: "批量更新成功",
      count: result.count,
      todos: updatedTodos,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "批量更新待办事项失败" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const data = batchDeleteSchema.parse(body)

    const todos = await prisma.todo.findMany({
      where: {
        id: { in: data.todoIds },
        userId: session.user.id,
      },
    })

    if (todos.length !== data.todoIds.length) {
      return NextResponse.json(
        { error: "部分待办事项不存在或无权限" },
        { status: 403 }
      )
    }

    const result = await prisma.todo.deleteMany({
      where: {
        id: { in: data.todoIds },
        userId: session.user.id,
      },
    })

    return NextResponse.json({
      message: "批量删除成功",
      count: result.count,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "批量删除待办事项失败" },
      { status: 500 }
    )
  }
}




