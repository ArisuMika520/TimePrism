import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { sendVerificationCode } from "@/lib/email/send"
import { z } from "zod"

const sendCodeSchema = z.object({
  email: z.string().email("无效的邮箱地址"),
})

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = sendCodeSchema.parse(body)

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "该邮箱已被注册" },
        { status: 400 }
      )
    }

    const recentCode = await prisma.emailVerificationCode.findFirst({
      where: {
        email,
        createdAt: {
          gte: new Date(Date.now() - 60 * 1000), // 60秒内
        },
      },
    })

    if (recentCode) {
      return NextResponse.json(
        { error: "请稍后再试，验证码发送过于频繁" },
        { status: 429 }
      )
    }

    const code = generateCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10分钟后过期

    await prisma.emailVerificationCode.deleteMany({
      where: { email }
    })

    await prisma.emailVerificationCode.create({
      data: {
        email,
        code,
        expiresAt,
      },
    })

    try {
      await sendVerificationCode(email, code)
    } catch (emailError) {
      return NextResponse.json(
        { error: "发送验证码失败，请检查邮箱地址或稍后重试" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: "验证码已发送到您的邮箱" },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "发送验证码失败，请稍后重试" },
      { status: 500 }
    )
  }
}
