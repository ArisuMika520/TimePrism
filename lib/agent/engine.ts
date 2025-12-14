import { prisma } from "@/lib/db/prisma"
import { createProvider } from "./providers"
import { WorkflowDefinition, WorkflowExecution, AgentMessage, Provider } from "./types"

export class AgentEngine {
  async executeWorkflow(
    workflowId: string,
    userId: string,
    input?: Record<string, any>
  ): Promise<WorkflowExecution> {
    const workflow = await prisma.agentWorkflow.findFirst({
      where: {
        id: workflowId,
        userId,
      },
    })

    if (!workflow) {
      throw new Error("工作流不存在")
    }

      const definition = workflow.workflow as unknown as WorkflowDefinition

    const execution = await prisma.agentExecution.create({
      data: {
        workflowId,
        userId,
        status: "PENDING",
        input: input || {},
      },
    })

    try {
      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: { status: "RUNNING" },
      })

      const output: Record<string, any> = {}
      let currentStepId = definition.steps[0]?.id

      while (currentStepId) {
        const step = definition.steps.find((s) => s.id === currentStepId)
        if (!step) break

        const stepResult = await this.executeStep(step, definition, input || {}, output)

        output[step.id] = stepResult

        if (step.next && step.next.length > 0) {
          currentStepId = step.next[0]
        } else {
          break
        }
      }

      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: "COMPLETED",
          output,
          completedAt: new Date(),
        },
      })

      return {
        id: execution.id,
        workflowId,
        status: "completed",
        input: input || {},
        output,
        startedAt: execution.startedAt,
        completedAt: new Date(),
      }
    } catch (error) {
      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: "FAILED",
          error: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        },
      })

      throw error
    }
  }

  private async executeStep(
    step: any,
    workflow: WorkflowDefinition,
    input: Record<string, any>,
    output: Record<string, any>
  ): Promise<any> {
    switch (step.type) {
      case "llm":
        return await this.executeLLMStep(step, workflow, input, output)
      case "action":
        return await this.executeActionStep(step, workflow, input, output)
      case "condition":
        return await this.executeConditionStep(step, workflow, input, output)
      default:
        throw new Error(`未知的步骤类型: ${step.type}`)
    }
  }

  private async executeLLMStep(
    step: any,
    workflow: WorkflowDefinition,
    input: Record<string, any>,
    output: Record<string, any>
  ): Promise<string> {
    const provider = step.config.provider || (workflow as any).provider || "openai"
    const messages: AgentMessage[] = []

    if (step.config.systemPrompt) {
      messages.push({
        role: "system",
        content: this.interpolate(step.config.systemPrompt, input, output),
      })
    }

    if (step.config.userPrompt) {
      messages.push({
        role: "user",
        content: this.interpolate(step.config.userPrompt, input, output),
      })
    }

    const providerInstance = createProvider(provider as Provider, {
      provider: provider as Provider,
      model: step.config.model,
      temperature: step.config.temperature,
      maxTokens: step.config.maxTokens,
      apiKey: step.config.apiKey,
      apiUrl: step.config.apiUrl,
    })

    return await providerInstance.chat(messages)
  }

  private async executeActionStep(
    step: any,
    workflow: WorkflowDefinition,
    input: Record<string, any>,
    output: Record<string, any>
  ): Promise<any> {
    const action = step.config.action

    switch (action) {
      case "summarizeTasks":
        return await this.summarizeTasks(input, output)
      case "generateDocument":
        return await this.generateDocument(input, output)
      default:
        throw new Error(`未知的操作: ${action}`)
    }
  }

  private async executeConditionStep(
    step: any,
    workflow: WorkflowDefinition,
    input: Record<string, any>,
    output: Record<string, any>
  ): Promise<boolean> {
    const condition = step.config.condition
    return true
  }

  private interpolate(template: string, input: Record<string, any>, output: Record<string, any>): string {
    let result = template
    const context = { input, output }

    result = result.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, type, key) => {
      if (type === "input") {
        return input[key] || ""
      } else if (type === "output") {
        return output[key] || ""
      }
      return match
    })

    return result
  }

  private async summarizeTasks(input: Record<string, any>, output: Record<string, any>): Promise<string> {
    const userId = input.userId
    if (!userId) {
      throw new Error("缺少userId")
    }

    const tasks = await prisma.task.findMany({
      where: { userId },
      include: { taskList: true },
    })

    const todos = await prisma.todo.findMany({
      where: { userId },
    })

    const summary = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.status === "COMPLETE").length,
      totalTodos: todos.length,
      completedTodos: todos.filter((t) => t.status === "COMPLETE").length,
      tasksByStatus: {
        TODO: tasks.filter((t) => t.status === "TODO").length,
        IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS").length,
        COMPLETE: tasks.filter((t) => t.status === "COMPLETE").length,
      },
    }

    return JSON.stringify(summary, null, 2)
  }

  private async generateDocument(input: Record<string, any>, output: Record<string, any>): Promise<string> {
    const taskId = input.taskId
    if (!taskId) {
      throw new Error("缺少taskId")
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { attachments: true },
    })

    if (!task) {
      throw new Error("任务不存在")
    }

    const provider = createProvider("openai", { provider: "openai" })
    const messages: AgentMessage[] = [
      {
        role: "system",
        content: "你是一个专业的文档生成助手，能够根据任务信息生成清晰、结构化的文档。",
      },
      {
        role: "user",
        content: `请为以下任务生成一份详细的文档：\n\n标题：${task.title}\n描述：${task.description || "无"}\n状态：${task.status}\n优先级：${task.priority}`,
      },
    ]

    const document = await provider.chat(messages)

    return document
  }
}

