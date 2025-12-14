import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"

// 获取未读消息和通知数量
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const [unreadNotifications, unreadMessages] = await Promise.all([
      prisma.notification.count({
        where: {
          userId: session.user.id,
          read: false,
        },
      }),
      prisma.message.count({
        where: {
          recipientId: session.user.id,
          read: false,
        },
      }),
    ])

    return NextResponse.json({
      notifications: unreadNotifications,
      messages: unreadMessages,
      total: unreadNotifications + unreadMessages,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "获取未读数量失败" },
      { status: 500 }
    )
  }
}



