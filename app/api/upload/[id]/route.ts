import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { deleteFile } from "@/lib/s3/client"
import { prisma } from "@/lib/db/prisma"

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

    const attachment = await prisma.attachment.findUnique({
      where: { id: id },
      include: {
        task: { select: { userId: true } },
        schedule: { select: { userId: true } },
      },
    })

    if (!attachment) {
      return NextResponse.json({ error: "文件不存在" }, { status: 404 })
    }

    // 验证权限（只有文件关联的任务或日程的所有者可以删除）
    const isOwner =
      (attachment.task && attachment.task.userId === session.user.id) ||
      (attachment.schedule && attachment.schedule.userId === session.user.id)

    if (!isOwner) {
      return NextResponse.json({ error: "无权限删除此文件" }, { status: 403 })
    }

    // 从URL中提取key（假设URL格式为 endpoint/bucket/key 或 cdn/key）
    const url = attachment.url
    const urlParts = url.split("/")
    const key = urlParts.slice(-2).join("/") // 获取最后两部分（uploads/userId/filename）

    // 从 S3 删除文件
    try {
      await deleteFile(key)
    } catch (error) {
      // 继续删除数据库记录
    }

    // 从数据库删除记录
    await prisma.attachment.delete({
      where: { id: id },
    })

    return NextResponse.json({ message: "删除成功" })
  } catch (error) {
    return NextResponse.json(
      { error: "删除失败，请稍后重试" },
      { status: 500 }
    )
  }
}

