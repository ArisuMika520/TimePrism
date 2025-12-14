import { WorkflowDefinition } from "../types"

export const summarizeTasksWorkflow: WorkflowDefinition = {
  id: "summarize-tasks",
  name: "总结任务进度",
  description: "总结当前用户的所有任务和待办事项的进度",
  provider: "openai",
  steps: [
    {
      id: "collect-data",
      name: "收集任务数据",
      type: "action",
      config: {
        action: "summarizeTasks",
      },
    },
    {
      id: "generate-summary",
      name: "生成总结",
      type: "llm",
      config: {
        provider: "openai",
        model: "gpt-4",
        systemPrompt: "你是一个任务管理助手，擅长分析和总结任务进度。",
        userPrompt: "请根据以下数据生成一份清晰的任务进度总结报告：\n\n{{output.collect-data}}",
      },
    },
  ],
  inputSchema: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        description: "用户ID",
      },
    },
    required: ["userId"],
  },
}

