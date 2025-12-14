import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"

// 标记消息为已读
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const message = await prisma.message.findFirst({
      where: {
        id: params.id,
        recipientId: session.user.id,
      },
    })

    if (!message) {
      return NextResponse.json({ error: "消息不存在" }, { status: 404 })
    }

    const updated = await prisma.message.update({
      where: { id: params.id },
      data: {
        read: true,
        readAt: new Date(),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json(
      { error: "标记失败" },
      { status: 500 }
    )
  }
}

// 删除消息
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const message = await prisma.message.findFirst({
      where: {
        id: params.id,
        OR: [
          { senderId: session.user.id },
          { recipientId: session.user.id },
        ],
      },
    })

    if (!message) {
      return NextResponse.json({ error: "消息不存在" }, { status: 404 })
    }

    await prisma.message.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "删除成功" })
  } catch (error) {
    return NextResponse.json(
      { error: "删除失败" },
      { status: 500 }
    )
  }
}



