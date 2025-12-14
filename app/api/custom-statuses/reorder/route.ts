import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const reorderSchema = z.object({
  statusIds: z.array(z.string()).min(1, "状态ID列表不能为空"),
})

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const data = reorderSchema.parse(body)

    const statuses = await prisma.userCustomStatus.findMany({
      where: {
        id: { in: data.statusIds },
        userId: session.user.id,
      },
    })

    if (statuses.length !== data.statusIds.length) {
      return NextResponse.json(
        { error: "部分状态不存在或无权限" },
        { status: 403 }
      )
    }

    const updates = data.statusIds.map((id, index) =>
      prisma.userCustomStatus.update({
        where: { id },
        data: { position: index },
      })
    )

    await Promise.all(updates)

    const updatedStatuses = await prisma.userCustomStatus.findMany({
      where: { userId: session.user.id },
      orderBy: { position: "asc" },
    })

    return NextResponse.json(updatedStatuses)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "更新状态排序失败" },
      { status: 500 }
    )
  }
}



