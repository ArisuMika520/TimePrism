import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const archiveActionSchema = z.object({
  todoIds: z.array(z.string()).min(1, "至少选择一个待办事项"),
  action: z.enum(["ARCHIVE", "UNARCHIVE"]).default("ARCHIVE"),
  bucket: z.enum(["FINISHED", "UNFINISHED"]).optional(),
  reason: z.string().max(500).optional().nullable(),
  autoArchived: z.boolean().optional(),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const data = archiveActionSchema.parse(body)

    const todos = await prisma.todo.findMany({
      where: {
        id: { in: data.todoIds },
        userId: session.user.id,
      },
      include: {
        customStatus: true,
      },
    })

    if (todos.length !== data.todoIds.length) {
      return NextResponse.json(
        { error: "部分待办事项不存在或无权限" },
        { status: 403 }
      )
    }

    if (data.action === "UNARCHIVE") {
      await prisma.todo.updateMany({
        where: {
          id: { in: data.todoIds },
          userId: session.user.id,
        },
        data: {
          archivedAt: null,
          archivedBucket: null,
          archivedReason: null,
          archivedBySystem: false,
        },
      })

      const refreshed = await prisma.todo.findMany({
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
        message: "已取消归档",
        todos: refreshed,
      })
    }

    const now = new Date()
    const autoArchived = data.autoArchived ?? false

    const archivePayload = todos.map((todo) => {
      const bucket =
        data.bucket ??
        (todo.status === "COMPLETE" ? "FINISHED" : "UNFINISHED")
      const reason =
        data.reason ??
        (bucket === "UNFINISHED" && todo.dueDate
          ? `逾期 ${todo.dueDate.toISOString()}`
          : null)

      return {
        todo,
        bucket,
        reason,
      }
    })

    await prisma.$transaction(async (tx) => {
      for (const payload of archivePayload) {
        await tx.todo.update({
          where: { id: payload.todo.id },
          data: {
            archivedAt: now,
            archivedBucket: payload.bucket,
            archivedReason: payload.reason,
            archivedBySystem: autoArchived,
          },
        })
      }

      await tx.todoArchiveLog.createMany({
        data: archivePayload.map((payload) => ({
          todoId: payload.todo.id,
          userId: session.user.id,
          bucket: payload.bucket,
          reason: payload.reason,
          autoArchived,
          archivedAt: now,
          snapshot: {
            title: payload.todo.title,
            status: payload.todo.status,
            priority: payload.todo.priority,
            dueDate: payload.todo.dueDate
              ? payload.todo.dueDate.toISOString()
              : null,
            customStatusId: payload.todo.customStatusId,
            tags: payload.todo.tags,
          },
        })),
      })
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
      message: "归档成功",
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
      { error: "归档操作失败" },
      { status: 500 }
    )
  }
}





