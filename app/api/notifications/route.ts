import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const createNotificationSchema = z.object({
  userId: z.string(),
  type: z.enum(["SYSTEM", "MESSAGE", "TASK_REMINDER", "TODO_REMINDER", "SCHEDULE_REMINDER"]),
  title: z.string().min(1),
  content: z.string().min(1),
  link: z.string().url().optional().nullable(),
})

// 获取通知列表
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const url = new URL(request.url)
    const read = url.searchParams.get("read")
    const page = parseInt(url.searchParams.get("page") || "1")
    const pageSize = parseInt(url.searchParams.get("pageSize") || "20")

    const where: any = {
      userId: session.user.id,
    }

    if (read === "true") {
      where.read = true
    } else if (read === "false") {
      where.read = false
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
    ])

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: "获取通知列表失败" },
      { status: 500 }
    )
  }
}

// 创建通知（管理员或系统使用）
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const data = createNotificationSchema.parse(body)

    // 验证目标用户存在
    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        content: data.content,
        link: data.link,
      },
    })

    return NextResponse.json(notification)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "创建通知失败" },
      { status: 500 }
    )
  }
}

// 批量标记为已读
export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const { notificationIds, all } = body

    if (all) {
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          read: false,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      })
    } else if (Array.isArray(notificationIds) && notificationIds.length > 0) {
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: session.user.id,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      })
    } else {
      return NextResponse.json(
        { error: "请提供通知ID或设置all为true" },
        { status: 400 }
      )
    }

    return NextResponse.json({ message: "标记成功" })
  } catch (error) {
    return NextResponse.json(
      { error: "标记失败" },
      { status: 500 }
    )
  }
}

// 批量删除通知
export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const url = new URL(request.url)
    const notificationIds = url.searchParams.getAll("id")

    if (notificationIds.length === 0) {
      return NextResponse.json(
        { error: "请提供要删除的通知ID" },
        { status: 400 }
      )
    }

    await prisma.notification.deleteMany({
      where: {
        id: { in: notificationIds },
        userId: session.user.id,
      },
    })

    return NextResponse.json({ message: "删除成功" })
  } catch (error) {
    return NextResponse.json(
      { error: "删除失败" },
      { status: 500 }
    )
  }
}



