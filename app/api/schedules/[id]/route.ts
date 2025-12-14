import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const updateScheduleSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  allDay: z.boolean().optional(),
  location: z.string().optional().nullable(),
  repeatRule: z.any().optional().nullable(),
  reminder: z.number().optional().nullable(),
  taskId: z.string().optional().nullable(),
  todoId: z.string().optional().nullable(),
})

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const schedule = await prisma.schedule.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        attachments: true,
      },
    })

    if (!schedule) {
      return NextResponse.json({ error: "日程不存在" }, { status: 404 })
    }

    return NextResponse.json(schedule)
  } catch (error) {
    return NextResponse.json(
      { error: "获取日程失败" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const data = updateScheduleSchema.parse(body)

    const schedule = await prisma.schedule.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!schedule) {
      return NextResponse.json({ error: "日程不存在" }, { status: 404 })
    }

    const updatedSchedule = await prisma.schedule.update({
      where: { id: params.id },
      data: {
        ...data,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
      },
      include: {
        attachments: true,
      },
    })

    return NextResponse.json(updatedSchedule)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "更新日程失败" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const schedule = await prisma.schedule.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!schedule) {
      return NextResponse.json({ error: "日程不存在" }, { status: 404 })
    }

    await prisma.schedule.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "删除成功" })
  } catch (error) {
    return NextResponse.json(
      { error: "删除日程失败" },
      { status: 500 }
    )
  }
}

