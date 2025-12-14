import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const updateCustomStatusSchema = z.object({
  name: z.string().min(1, "状态名称不能为空").optional(),
  color: z.string().optional().nullable(),
  position: z.number().optional(),
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

    const customStatus = await prisma.userCustomStatus.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!customStatus) {
      return NextResponse.json({ error: "自定义状态不存在" }, { status: 404 })
    }

    return NextResponse.json(customStatus)
  } catch (error) {
    return NextResponse.json(
      { error: "获取自定义状态失败" },
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
    const data = updateCustomStatusSchema.parse(body)

    const existingStatus = await prisma.userCustomStatus.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existingStatus) {
      return NextResponse.json({ error: "自定义状态不存在" }, { status: 404 })
    }

    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.color !== undefined) updateData.color = data.color
    if (data.position !== undefined) updateData.position = data.position

    const updatedStatus = await prisma.userCustomStatus.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(updatedStatus)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "更新自定义状态失败" },
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

    const existingStatus = await prisma.userCustomStatus.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existingStatus) {
      return NextResponse.json({ error: "自定义状态不存在" }, { status: 404 })
    }

    const todosWithStatus = await prisma.todo.count({
      where: {
        customStatusId: params.id,
        userId: session.user.id,
      },
    })

    if (todosWithStatus > 0) {
      return NextResponse.json(
        { error: "无法删除：仍有待办事项使用此状态" },
        { status: 400 }
      )
    }

    await prisma.userCustomStatus.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "删除成功" })
  } catch (error) {
    return NextResponse.json(
      { error: "删除自定义状态失败" },
      { status: 500 }
    )
  }
}



