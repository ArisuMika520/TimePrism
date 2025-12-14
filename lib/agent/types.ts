export type Provider = "openai" | "anthropic" | "deepseek" | "kimi" | "custom"

export interface AgentMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface AgentConfig {
  provider: Provider
  model?: string
  temperature?: number
  maxTokens?: number
  apiKey?: string
  apiUrl?: string
}

export interface WorkflowStep {
  id: string
  name: string
  type: "llm" | "action" | "condition"
  config: Record<string, any>
  next?: string[]
}

export interface WorkflowDefinition {
  id: string
  name: string
  description?: string
  steps: WorkflowStep[]
  inputSchema?: Record<string, any>
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  status: "pending" | "running" | "completed" | "failed" | "cancelled"
  input?: Record<string, any>
  output?: Record<string, any>
  error?: string
  startedAt: Date
  completedAt?: Date
}

