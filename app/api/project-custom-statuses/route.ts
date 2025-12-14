import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const customStatusSchema = z.object({
  name: z.string().min(1, "状态名称不能为空"),
  color: z.string().optional().nullable(),
})

// 获取用户的Project自定义状态列表
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const customStatuses = await prisma.projectCustomStatus.findMany({
      where: { userId: session.user.id },
      orderBy: { position: "asc" },
    })

    return NextResponse.json(customStatuses)
  } catch (error) {
    return NextResponse.json(
      { error: "获取Project自定义状态失败" },
      { status: 500 }
    )
  }
}

// 创建Project自定义状态
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const data = customStatusSchema.parse(body)

    const maxPosition = await prisma.projectCustomStatus.findFirst({
      where: { userId: session.user.id },
      orderBy: { position: "desc" },
      select: { position: true },
    })

    const customStatus = await prisma.projectCustomStatus.create({
      data: {
        name: data.name,
        color: data.color || null,
        userId: session.user.id,
        position: (maxPosition?.position ?? -1) + 1,
      },
    })

    return NextResponse.json(customStatus, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "创建Project自定义状态失败" },
      { status: 500 }
    )
  }
}

