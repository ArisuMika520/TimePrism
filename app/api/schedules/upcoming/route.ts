import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { startOfDay, addDays } from "date-fns"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const url = new URL(request.url)
    const daysParam = Number(url.searchParams.get("days") ?? "3")
    const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 30) : 3

    const now = new Date()
    const startDate = startOfDay(now)
    const endDate = addDays(startDate, days)

    // 获取未来N天的日程
    const schedules = await prisma.schedule.findMany({
      where: {
        userId: session.user.id,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        startTime: "asc",
      },
      take: 10, // 最多返回10个
    })

    const result = schedules.map((schedule) => ({
      id: schedule.id,
      title: schedule.title,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      type: schedule.location || "日程",
    }))

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: "获取日程失败" },
      { status: 500 }
    )
  }
}




