import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const updateTaskListSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  position: z.number().optional(),
})

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
    const data = updateTaskListSchema.parse(body)

    const taskList = await prisma.taskList.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!taskList) {
      return NextResponse.json({ error: "任务列表不存在" }, { status: 404 })
    }

    const updatedTaskList = await prisma.taskList.update({
      where: { id: params.id },
      data,
      include: {
        tasks: {
          orderBy: { position: "asc" },
          include: {
            attachments: true,
          },
        },
      },
    })

    return NextResponse.json(updatedTaskList)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "更新任务列表失败" },
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

    const taskList = await prisma.taskList.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!taskList) {
      return NextResponse.json({ error: "任务列表不存在" }, { status: 404 })
    }

    await prisma.taskList.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "删除成功" })
  } catch (error) {
    return NextResponse.json(
      { error: "删除任务列表失败" },
      { status: 500 }
    )
  }
}

