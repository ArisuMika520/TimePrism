import { BaseProvider } from "./base"
import { AgentMessage, AgentConfig } from "../types"

export class CustomProvider extends BaseProvider {
  async chat(messages: AgentMessage[]): Promise<string> {
    const apiUrl = this.config.apiUrl || process.env.CUSTOM_API_URL
    const apiKey = this.config.apiKey || process.env.CUSTOM_API_KEY

    if (!apiUrl) {
      throw new Error("自定义API URL未配置")
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: this.config.temperature ?? 0.7,
        max_tokens: this.config.maxTokens,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(`自定义API错误: ${error.message || response.statusText}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || data.content || data.text || ""
  }

  async *streamChat(messages: AgentMessage[]): AsyncGenerator<string, void, unknown> {
    const result = await this.chat(messages)
    yield result
  }
}

