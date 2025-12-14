import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const registerSchema = z.object({
  email: z.string().email("无效的邮箱地址"),
  password: z.string().min(6, "密码至少需要6个字符"),
  name: z.string().optional(),
  code: z.string().length(6, "验证码必须是6位数字"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name, code } = registerSchema.parse(body)

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "该邮箱已被注册" },
        { status: 400 }
      )
    }

    const verificationCode = await prisma.emailVerificationCode.findFirst({
      where: {
        email,
        code,
        expiresAt: {
          gte: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    if (!verificationCode) {
      return NextResponse.json(
        { error: "验证码无效或已过期" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split("@")[0],
      },
      select: {
        id: true,
        email: true,
        name: true,
      }
    })

    await prisma.emailVerificationCode.delete({
      where: { id: verificationCode.id },
    })

    return NextResponse.json(
      { message: "注册成功", user },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    )
  }
}

