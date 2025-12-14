import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const scheduleSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  description: z.string().optional().nullable(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  allDay: z.boolean().default(false),
  location: z.string().optional().nullable(),
  repeatRule: z.any().optional().nullable(),
  reminder: z.number().optional().nullable(),
  taskId: z.string().optional().nullable(),
  todoId: z.string().optional().nullable(),
})

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const start = searchParams.get("start")
    const end = searchParams.get("end")

    const where: any = {
      userId: session.user.id,
    }

    if (start && end) {
      where.OR = [
        {
          startTime: {
            gte: new Date(start),
            lte: new Date(end),
          },
        },
        {
          endTime: {
            gte: new Date(start),
            lte: new Date(end),
          },
        },
        {
          AND: [
            { startTime: { lte: new Date(start) } },
            { endTime: { gte: new Date(end) } },
          ],
        },
      ]
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        attachments: true,
      },
      orderBy: { startTime: "asc" },
    })

    return NextResponse.json(schedules)
  } catch (error) {
    return NextResponse.json(
      { error: "获取日程失败" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const data = scheduleSchema.parse(body)

    const schedule = await prisma.schedule.create({
      data: {
        ...data,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        userId: session.user.id,
      },
      include: {
        attachments: true,
      },
    })

    return NextResponse.json(schedule, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "创建日程失败" },
      { status: 500 }
    )
  }
}

