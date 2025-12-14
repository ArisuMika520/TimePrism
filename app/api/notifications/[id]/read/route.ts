import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"

// 标记单个通知为已读
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const notification = await prisma.notification.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!notification) {
      return NextResponse.json({ error: "通知不存在" }, { status: 404 })
    }

    const updated = await prisma.notification.update({
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



