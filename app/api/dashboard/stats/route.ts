import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { startOfDay, endOfDay, isToday } from "date-fns"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)

    const [totalTodos, completedTodos, todosToday] = await Promise.all([
      prisma.todo.count({
        where: {
          userId: session.user.id,
          archivedAt: null,
        },
      }),
      prisma.todo.count({
        where: {
          userId: session.user.id,
          archivedAt: null,
          status: "COMPLETE",
        },
      }),
      prisma.todo.count({
        where: {
          userId: session.user.id,
          archivedAt: null,
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      }),
    ])

    const [totalTasks, inProgressTasks, tasksDueToday] = await Promise.all([
      prisma.task.count({
        where: {
          userId: session.user.id,
        },
      }),
      prisma.task.count({
        where: {
          userId: session.user.id,
          status: "IN_PROGRESS",
        },
      }),
      prisma.task.count({
        where: {
          userId: session.user.id,
          dueDate: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      }),
    ])

    const schedulesToday = await prisma.schedule.count({
      where: {
        userId: session.user.id,
        startTime: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    })

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const todosLastWeek = await prisma.todo.findMany({
      where: {
        userId: session.user.id,
        archivedAt: null,
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        status: true,
      },
    })

    const completedLastWeek = todosLastWeek.filter((t) => t.status === "COMPLETE").length
    const completionRate = todosLastWeek.length > 0 
      ? Math.round((completedLastWeek / todosLastWeek.length) * 100)
      : 0

    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const todosTwoWeeksAgo = await prisma.todo.findMany({
      where: {
        userId: session.user.id,
        archivedAt: null,
        createdAt: {
          gte: fourteenDaysAgo,
          lt: sevenDaysAgo,
        },
      },
      select: {
        status: true,
      },
    })

    const completedTwoWeeksAgo = todosTwoWeeksAgo.filter((t) => t.status === "COMPLETE").length
    const lastWeekRate = todosTwoWeeksAgo.length > 0
      ? Math.round((completedTwoWeeksAgo / todosTwoWeeksAgo.length) * 100)
      : 0

    const completionRateChange = completionRate - lastWeekRate

    return NextResponse.json({
      todos: {
        total: totalTodos,
        completed: completedTodos,
        today: todosToday,
      },
      tasks: {
        total: totalTasks,
        inProgress: inProgressTasks,
        dueToday: tasksDueToday,
      },
      schedules: {
        today: schedulesToday,
      },
      completionRate: {
        value: completionRate,
        change: completionRateChange,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: "获取仪表板统计失败" },
      { status: 500 }
    )
  }
}




