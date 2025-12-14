import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { startOfDay, endOfDay, subDays, format } from "date-fns"
import { zhCN } from "date-fns/locale"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const url = new URL(request.url)
    const daysParam = Number(url.searchParams.get("days") ?? "7")
    const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 30) : 7

    const now = new Date()
    const endDate = endOfDay(now)
    const startDate = startOfDay(subDays(now, days - 1))

    // 获取过去N天的所有待办事项（包括创建的和完成的）
    const [createdTodos, completedTodos] = await Promise.all([
      // 统计每天创建的待办
      prisma.todo.findMany({
        where: {
          userId: session.user.id,
          archivedAt: null,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          createdAt: true,
        },
      }),
      // 统计每天完成的待办（状态为COMPLETE且在该日期范围内更新）
      prisma.todo.findMany({
        where: {
          userId: session.user.id,
          archivedAt: null,
          status: "COMPLETE",
          updatedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          updatedAt: true,
        },
      }),
    ])

    // 按日期分组统计
    const statsByDate: Record<string, { completed: number; total: number }> = {}

    // 初始化所有日期
    for (let i = 0; i < days; i++) {
      const date = subDays(now, days - 1 - i)
      const dateKey = format(date, "yyyy-MM-dd")
      statsByDate[dateKey] = { completed: 0, total: 0 }
    }

    // 统计每天创建的待办总数
    createdTodos.forEach((todo) => {
      const dateKey = format(todo.createdAt, "yyyy-MM-dd")
      if (statsByDate[dateKey]) {
        statsByDate[dateKey].total++
      }
    })

    // 统计每天完成的待办数量
    completedTodos.forEach((todo) => {
      const dateKey = format(todo.updatedAt, "yyyy-MM-dd")
      if (statsByDate[dateKey]) {
        statsByDate[dateKey].completed++
      }
    })

    // 转换为数组格式，显示最近N天的日期，按日期顺序
    const result = Object.keys(statsByDate)
      .sort() // 按日期字符串排序（yyyy-MM-dd格式可以直接字符串排序）
      .map((date) => {
        const dateObj = new Date(date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const dateOnly = new Date(dateObj)
        dateOnly.setHours(0, 0, 0, 0)
        
        // 计算日期差
        const diffDays = Math.floor((dateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        let dateLabel: string
        if (diffDays === 0) {
          dateLabel = "今天"
        } else if (diffDays === -1) {
          dateLabel = "昨天"
        } else if (diffDays === -2) {
          dateLabel = "2天前"
        } else if (diffDays === -3) {
          dateLabel = "3天前"
        } else if (diffDays === -4) {
          dateLabel = "4天前"
        } else if (diffDays === -5) {
          dateLabel = "5天前"
        } else if (diffDays === -6) {
          dateLabel = "6天前"
        } else {
          dateLabel = format(dateObj, "MM月dd日", { locale: zhCN })
        }
        
        const stats = statsByDate[date]
        return {
          date: dateLabel,
          completed: stats.completed,
          total: stats.total,
        }
      })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: "获取待办统计失败" },
      { status: 500 }
    )
  }
}

