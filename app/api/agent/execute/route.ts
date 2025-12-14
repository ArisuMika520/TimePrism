import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { AgentEngine } from "@/lib/agent/engine"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const { workflowId, input } = body

    if (!workflowId) {
      return NextResponse.json(
        { error: "缺少workflowId" },
        { status: 400 }
      )
    }

    const engine = new AgentEngine()
    const execution = await engine.executeWorkflow(
      workflowId,
      session.user.id,
      input
    )

    return NextResponse.json(execution)
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "执行工作流失败",
      },
      { status: 500 }
    )
  }
}

