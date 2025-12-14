import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { uploadFile, getFileUrl, deleteFile, getPresignedUrl } from "@/lib/s3/client"
import { prisma } from "@/lib/db/prisma"
import { randomBytes } from "crypto"

// 上传附件
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    // 验证 Todo 存在且属于当前用户
    const todo = await prisma.todo.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    })

    if (!todo) {
      return NextResponse.json({ error: "待办事项不存在" }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "未提供文件" }, { status: 400 })
    }

    // 验证文件大小（最大10MB）
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "文件大小不能超过10MB" },
        { status: 400 }
      )
    }

    // 生成唯一文件名
    const fileExtension = file.name.split(".").pop()
    const fileName = `${randomBytes(16).toString("hex")}.${fileExtension}`
    const key = `uploads/${session.user.id}/${fileName}`

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 上传到S3（带重试机制）
    try {
      await uploadFile(buffer, key, file.type)
    } catch (error) {
      // 错误处理
      return NextResponse.json(
        { error: "文件上传失败，请稍后重试" },
        { status: 500 }
      )
    }

    // 获取文件URL
    const url = getFileUrl(key)

    // 保存到数据库并关联到 Todo
    const attachment = await prisma.attachment.create({
      data: {
        filename: file.name,
        url,
        mimeType: file.type,
        size: file.size,
        todoId: id,
      },
    })

    return NextResponse.json({
      id: attachment.id,
      url: attachment.url,
      filename: attachment.filename,
      size: attachment.size,
      mimeType: attachment.mimeType,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "上传失败，请稍后重试" },
      { status: 500 }
    )
  }
}

// 删除附件
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

    const url = new URL(request.url)
    const attachmentId = url.searchParams.get("attachmentId")

    if (!attachmentId) {
      return NextResponse.json({ error: "缺少附件ID" }, { status: 400 })
    }

    // 验证附件存在且属于当前用户的 Todo
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        todo: { select: { userId: true } },
      },
    })

    if (!attachment) {
      return NextResponse.json({ error: "文件不存在" }, { status: 404 })
    }

    if (!attachment.todo || attachment.todo.userId !== session.user.id) {
      return NextResponse.json({ error: "无权限删除此文件" }, { status: 403 })
    }

    // 从URL中提取key
    const fileUrl = attachment.url
    const urlParts = fileUrl.split("/")
    const key = urlParts.slice(-2).join("/") // 获取最后两部分（uploads/userId/filename）

    // 从S3删除文件
    try {
      await deleteFile(key)
    } catch (error) {

      // 继续删除数据库记录
    }

    // 从数据库删除记录
    await prisma.attachment.delete({
      where: { id: attachmentId },
    })

    return NextResponse.json({ message: "删除成功" })
  } catch (error) {
    // 错误处理
    return NextResponse.json(
      { error: "删除失败，请稍后重试" },
      { status: 500 }
    )
  }
}

// 获取附件下载URL（使用预签名URL）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const url = new URL(request.url)
    const attachmentId = url.searchParams.get("attachmentId")

    if (!attachmentId) {
      return NextResponse.json({ error: "缺少附件ID" }, { status: 400 })
    }

    // 验证附件存在且属于当前用户的 Todo
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        todo: { select: { userId: true } },
      },
    })

    if (!attachment) {
      return NextResponse.json({ error: "附件不存在" }, { status: 404 })
    }

    if (!attachment.todo || attachment.todo.userId !== session.user.id) {
      return NextResponse.json({ error: "无权限访问此文件" }, { status: 403 })
    }

    // 从URL中提取key
    const fileUrl = attachment.url
    const urlParts = fileUrl.split("/")
    const key = urlParts.slice(-2).join("/") // 获取最后两部分（uploads/userId/filename）

    // 生成预签名URL（1小时有效期）
    const presignedUrl = await getPresignedUrl(key, 3600)

    return NextResponse.json({
      url: presignedUrl,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "获取下载链接失败，请稍后重试" },
      { status: 500 }
    )
  }
}



