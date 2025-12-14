import { WorkflowDefinition } from "../types"

export const generateDocumentWorkflow: WorkflowDefinition = {
  id: "generate-document",
  name: "生成任务文档",
  description: "为指定任务生成详细文档并自动嵌入到任务中",
  provider: "openai",
  steps: [
    {
      id: "generate-doc",
      name: "生成文档",
      type: "action",
      config: {
        action: "generateDocument",
      },
    },
    {
      id: "format-doc",
      name: "格式化文档",
      type: "llm",
      config: {
        provider: "openai",
        model: "gpt-4",
        systemPrompt: "你是一个专业的文档格式化助手，能够将文档格式化为Markdown格式。",
        userPrompt: "请将以下文档格式化为Markdown格式：\n\n{{output.generate-doc}}",
      },
    },
  ],
  inputSchema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "任务ID",
      },
    },
    required: ["taskId"],
  },
}

