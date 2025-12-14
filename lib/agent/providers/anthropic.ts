import { BaseProvider } from "./base"
import { AgentMessage, AgentConfig } from "../types"

export class AnthropicProvider extends BaseProvider {
  async chat(messages: AgentMessage[]): Promise<string> {
    const apiKey = this.config.apiKey || process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error("Anthropic API密钥未配置")
    }

    const systemMessage = messages.find((m) => m.role === "system")
    const conversationMessages = messages.filter((m) => m.role !== "system")

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.config.model || "claude-3-5-sonnet-20241022",
        max_tokens: this.config.maxTokens || 1024,
        temperature: this.config.temperature ?? 0.7,
        system: systemMessage?.content,
        messages: conversationMessages.map((msg) => ({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content,
        })),
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Anthropic API错误: ${error.error?.message || response.statusText}`)
    }

    const data = await response.json()
    return data.content[0]?.text || ""
  }

  async *streamChat(messages: AgentMessage[]): AsyncGenerator<string, void, unknown> {
    const apiKey = this.config.apiKey || process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error("Anthropic API密钥未配置")
    }

    const systemMessage = messages.find((m) => m.role === "system")
    const conversationMessages = messages.filter((m) => m.role !== "system")

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.config.model || "claude-3-5-sonnet-20241022",
        max_tokens: this.config.maxTokens || 1024,
        temperature: this.config.temperature ?? 0.7,
        system: systemMessage?.content,
        messages: conversationMessages.map((msg) => ({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content,
        })),
        stream: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API错误: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error("无法读取响应流")
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split("\n").filter((line) => line.trim() !== "")

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6)
          if (data === "[DONE]") break

          try {
            const json = JSON.parse(data)
            if (json.type === "content_block_delta") {
              const content = json.delta?.text
              if (content) {
                yield content
              }
            }
          } catch (e) {
          }
        }
      }
    }
  }
}

