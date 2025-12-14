import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { uploadFile, getFileUrl, deleteFile } from "@/lib/s3/client"
import { prisma } from "@/lib/db/prisma"
import { randomBytes } from "crypto"
import { processAvatarImage } from "@/lib/image/process"

// 上传头像
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

    // 验证文件类型（仅允许图片）
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "仅支持图片文件（JPEG, PNG, GIF, WebP）" },
        { status: 400 }
      )
    }

    // 验证文件大小（最大5MB）
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "文件大小不能超过5MB" },
        { status: 400 }
      )
    }

    // 获取当前用户信息
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    })

    // 如果用户已有头像，删除旧头像
    if (user?.image) {
      try {
        // 从URL中提取key
        // 支持格式：
        // - https://cdn.example.com/avatars/userId/filename.webp
        // - https://s3.endpoint.com/bucket/avatars/userId/filename.webp
        const url = new URL(user.image)
        const pathParts = url.pathname.split("/").filter(Boolean)
        const avatarsIndex = pathParts.findIndex((part) => part === "avatars")
        
        if (avatarsIndex !== -1) {
          const key = pathParts.slice(avatarsIndex).join("/")
          await deleteFile(key)
        } else {
          const key = pathParts.join("/")
          if (key.includes("avatars")) {
            await deleteFile(key)
          }
        }
      } catch (error) {
      }
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer()
    const originalBuffer = Buffer.from(arrayBuffer)

    // 处理图片：压缩并转换为 WebP
    let processedBuffer: Buffer
    let contentType = "image/webp"
    try {
      processedBuffer = await processAvatarImage(originalBuffer, 400, 400, 80)
      // 图片处理成功
    } catch (error) {
      processedBuffer = originalBuffer
      contentType = file.type
    }

    // 生成唯一文件名（始终使用 .webp 扩展名）
    const fileName = `${randomBytes(16).toString("hex")}.webp`
    const key = `avatars/${session.user.id}/${fileName}`

    // 上传到S3
    try {
      await uploadFile(processedBuffer, key, contentType)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return NextResponse.json(
        { 
          error: "头像上传失败，请稍后重试",
          details: process.env.NODE_ENV === "development" ? errorMessage : undefined
        },
        { status: 500 }
      )
    }

    // 获取文件URL
    const url = getFileUrl(key)

    // 更新用户记录
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { image: url },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
      },
    })

    return NextResponse.json({
      url: updatedUser.image,
      user: updatedUser,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "上传失败，请稍后重试" },
      { status: 500 }
    )
  }
}

