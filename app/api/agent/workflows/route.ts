import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const workflowSchema = z.object({
  name: z.string().min(1, "名称不能为空"),
  description: z.string().optional(),
  workflow: z.any(),
  provider: z.enum(["openai", "anthropic", "deepseek", "kimi", "custom"]),
})

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const workflows = await prisma.agentWorkflow.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(workflows)
  } catch (error) {
    return NextResponse.json(
      { error: "获取工作流失败" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const data = workflowSchema.parse(body)

    const workflow = await prisma.agentWorkflow.create({
      data: {
        ...data,
        userId: session.user.id,
      },
    })

    return NextResponse.json(workflow, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "创建工作流失败" },
      { status: 500 }
    )
  }
}

