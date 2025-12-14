import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { format, startOfDay, endOfDay, subDays } from "date-fns"

interface LogDay {
  date: string
  finished: number
  unfinished: number
  entries: Array<{
    id: string
    bucket: string
    reason: string | null
    autoArchived: boolean
    archivedAt: string
    snapshot: unknown
  }>
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const url = new URL(request.url)
    const latest = url.searchParams.get("latest") === "true"
    const daysParam = Number(url.searchParams.get("days") ?? "14")
    const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 30) : 14

    const dateToParam = url.searchParams.get("dateTo")
    const dateFromParam = url.searchParams.get("dateFrom")

    const now = new Date()
    const rangeEnd = dateToParam ? endOfDay(new Date(dateToParam)) : endOfDay(now)
    const rangeStart = dateFromParam
      ? startOfDay(new Date(dateFromParam))
      : startOfDay(subDays(rangeEnd, days - 1))

    const where = latest
      ? {
          userId: session.user.id,
          archivedAt: {
            gte: startOfDay(now),
          },
        }
      : {
          userId: session.user.id,
          archivedAt: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        }

    const logs = await prisma.todoArchiveLog.findMany({
      where,
      orderBy: { archivedAt: "desc" },
    })

    const grouped = logs.reduce<Record<string, LogDay>>((acc, log) => {
      const key = format(log.archivedAt, "yyyy-MM-dd")
      if (!acc[key]) {
        acc[key] = {
          date: key,
          finished: 0,
          unfinished: 0,
          entries: [],
        }
      }
      if (log.bucket === "FINISHED") {
        acc[key].finished += 1
      } else {
        acc[key].unfinished += 1
      }
      acc[key].entries.push({
        id: log.id,
        bucket: log.bucket,
        reason: log.reason,
        autoArchived: log.autoArchived,
        archivedAt: log.archivedAt.toISOString(),
        snapshot: log.snapshot,
      })
      return acc
    }, {})

    const daysPayload = Object.values(grouped).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    if (latest) {
      const todayKey = format(now, "yyyy-MM-dd")
      const todayLog = grouped[todayKey]
      return NextResponse.json({
        summary: todayLog
          ? {
              date: todayKey,
              finished: todayLog.finished,
              unfinished: todayLog.unfinished,
              total: todayLog.finished + todayLog.unfinished,
            }
          : null,
      })
    }

    return NextResponse.json({
      days: daysPayload,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "获取归档日志失败" },
      { status: 500 }
    )
  }
}





