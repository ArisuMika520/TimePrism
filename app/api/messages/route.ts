import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const sendMessageSchema = z.object({
  recipientId: z.string(),
  content: z.string().min(1),
  conversationId: z.string().optional(),
})

// 获取对话列表或特定对话的消息
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const url = new URL(request.url)
    const conversationId = url.searchParams.get("conversationId")
    const otherUserId = url.searchParams.get("otherUserId")

    if (conversationId) {
      // 获取特定对话的消息
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          participants: {
            some: {
              userId: session.user.id,
            },
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "asc" },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
              recipient: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
      })

      if (!conversation) {
        return NextResponse.json({ error: "对话不存在" }, { status: 404 })
      }

      return NextResponse.json(conversation)
    } else if (otherUserId) {
      // 获取与特定用户的对话
      const conversation = await prisma.conversation.findFirst({
        where: {
          participants: {
            every: {
              userId: {
                in: [session.user.id, otherUserId],
              },
            },
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "asc" },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
              recipient: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
      })

      return NextResponse.json(conversation || null)
    } else {
      // 获取对话列表
      const conversations = await prisma.conversation.findMany({
        where: {
          participants: {
            some: {
              userId: session.user.id,
            },
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { lastMessageAt: "desc" },
      })

      return NextResponse.json(conversations)
    }
  } catch (error) {
    // 错误处理
    return NextResponse.json(
      { error: "获取消息失败" },
      { status: 500 }
    )
  }
}

// 发送消息
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const data = sendMessageSchema.parse(body)

    const recipient = await prisma.user.findUnique({
      where: { id: data.recipientId },
    })

    if (!recipient) {
      return NextResponse.json({ error: "接收者不存在" }, { status: 404 })
    }

    if (data.recipientId === session.user.id) {
      return NextResponse.json(
        { error: "不能给自己发送消息" },
        { status: 400 }
      )
    }

    let conversation = null

    if (data.conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: {
          id: data.conversationId,
          participants: {
            some: {
              userId: session.user.id,
            },
          },
        },
      })

      if (!conversation) {
        return NextResponse.json({ error: "对话不存在" }, { status: 404 })
      }
    } else {
      conversation = await prisma.conversation.findFirst({
        where: {
          participants: {
            every: {
              userId: {
                in: [session.user.id, data.recipientId],
              },
            },
          },
        },
      })

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            participants: {
              create: [
                { userId: session.user.id },
                { userId: data.recipientId },
              ],
            },
          },
        })
      }
    }

    // 创建消息
    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        recipientId: data.recipientId,
        content: data.content,
        conversationId: conversation.id,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    // 更新对话的最后消息时间
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
      },
    })

    // 创建通知
    await prisma.notification.create({
      data: {
        userId: data.recipientId,
        type: "MESSAGE",
        title: "新消息",
        content: `${session.user?.name || "用户"} 给您发送了一条消息`,
        link: `/dashboard/messages?conversationId=${conversation.id}`,
      },
    })

    return NextResponse.json(message)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "发送消息失败" },
      { status: 500 }
    )
  }
}




