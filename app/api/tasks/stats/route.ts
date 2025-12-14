import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    // 获取所有待办事项的状态统计（排除已归档的）
    const todos = await prisma.todo.findMany({
      where: {
        userId: session.user.id,
        archivedAt: null, // 只统计未归档的待办
      },
      select: {
        status: true,
      },
    })

    // 统计各状态的数量（Todo状态：WAIT, IN_PROGRESS, COMPLETE）
    const statusCounts: Record<string, number> = {
      WAIT: 0,
      IN_PROGRESS: 0,
      COMPLETE: 0,
    }

    todos.forEach((todo) => {
      const status = todo.status || "WAIT"
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++
      } else {
        statusCounts[status] = 1
      }
    })

    const result = [
      { name: "待处理", value: statusCounts.WAIT || 0 },
      { name: "进行中", value: statusCounts.IN_PROGRESS || 0 },
      { name: "已完成", value: statusCounts.COMPLETE || 0 },
    ]

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: "获取待办统计失败" },
      { status: 500 }
    )
  }
}

