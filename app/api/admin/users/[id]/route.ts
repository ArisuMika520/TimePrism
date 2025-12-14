import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (currentUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 })
    }

    const body = await request.json()
    const { role } = body

    if (!role || !["USER", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "无效的角色" }, { status: 400 })
    }

    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: "不能修改自己的角色" },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json(
      { error: "更新用户角色失败" },
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

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (currentUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 })
    }

    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: "不能删除自己" },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "删除用户失败" }, { status: 500 })
  }
}
