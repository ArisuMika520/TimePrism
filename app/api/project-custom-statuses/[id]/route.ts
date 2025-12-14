import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const updateCustomStatusSchema = z.object({
  name: z.string().min(1, "状态名称不能为空").optional(),
  color: z.string().optional().nullable(),
  position: z.number().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const data = updateCustomStatusSchema.parse(body)

    // 验证自定义状态属于当前用户
    const existingStatus = await prisma.projectCustomStatus.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    })

    if (!existingStatus) {
      return NextResponse.json({ error: "自定义状态不存在" }, { status: 404 })
    }

    const customStatus = await prisma.projectCustomStatus.update({
      where: { id: id },
      data,
    })

    return NextResponse.json(customStatus)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "更新Project自定义状态失败" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    // 验证自定义状态属于当前用户
    const existingStatus = await prisma.projectCustomStatus.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    })

    if (!existingStatus) {
      return NextResponse.json({ error: "自定义状态不存在" }, { status: 404 })
    }

    // 检查是否有Task使用此自定义状态
    const tasksUsingStatus = await prisma.task.count({
      where: { customStatusId: id },
    })

    if (tasksUsingStatus > 0) {
      return NextResponse.json(
        { error: "该状态正在被使用，无法删除" },
        { status: 400 }
      )
    }

    await prisma.projectCustomStatus.delete({
      where: { id: id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "删除Project自定义状态失败" },
      { status: 500 }
    )
  }
}

