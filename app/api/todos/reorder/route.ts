import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const reorderSchema = z.object({
  status: z.enum(["WAIT", "IN_PROGRESS", "COMPLETE"]),
  customStatusId: z.string().nullable().optional(),
  todoIds: z.array(z.string()).min(1, "待办ID列表不能为空"),
})

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const data = reorderSchema.parse(body)
    const resolvedCustomStatusId = data.customStatusId ?? null

    // 确认所有待办都属于当前用户
    const todos = await prisma.todo.findMany({
      where: {
        id: { in: data.todoIds },
        userId: session.user.id,
      },
      select: {
        id: true,
        status: true,
        customStatusId: true,
      },
    })

    if (todos.length !== data.todoIds.length) {
      return NextResponse.json(
        { error: "部分待办不存在或无权限" },
        { status: 403 }
      )
    }

    // 确认这些待办都在相同的状态组
    const mismatch = todos.some(
      (todo) =>
        todo.status !== data.status ||
        (todo.customStatusId ?? null) !== resolvedCustomStatusId
    )

    if (mismatch) {
      return NextResponse.json(
        { error: "待办状态不匹配，无法排序" },
        { status: 400 }
      )
    }

    // 更新 position
    await prisma.$transaction(
      data.todoIds.map((id, index) =>
        prisma.todo.update({
          where: { id },
          data: { position: index },
        })
      )
    )

    const updatedTodos = await prisma.todo.findMany({
      where: {
        userId: session.user.id,
        status: data.status,
        customStatusId: resolvedCustomStatusId,
      },
      orderBy: {
        position: "asc",
      },
    })

    return NextResponse.json({ todos: updatedTodos })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "更新待办排序失败" },
      { status: 500 }
    )
  }
}






