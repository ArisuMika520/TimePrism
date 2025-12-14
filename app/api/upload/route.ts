import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { uploadFile, getFileUrl } from "@/lib/s3/client"
import { prisma } from "@/lib/db/prisma"
import { randomBytes } from "crypto"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "未提供文件" }, { status: 400 })
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "仅支持图片文件（JPEG, PNG, GIF, WebP）" },
        { status: 400 }
      )
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

    // 上传到S3
    await uploadFile(buffer, key, file.type)

    // 获取文件URL
    const url = getFileUrl(key)

    // 保存到数据库
    const attachment = await prisma.attachment.create({
      data: {
        filename: file.name,
        url,
        mimeType: file.type,
        size: file.size,
      },
    })

    return NextResponse.json({
      id: attachment.id,
      url: attachment.url,
      filename: attachment.filename,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "上传失败，请稍后重试" },
      { status: 500 }
    )
  }
}

