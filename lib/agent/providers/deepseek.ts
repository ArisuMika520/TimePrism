import { BaseProvider } from "./base"
import { AgentMessage, AgentConfig } from "../types"

export class DeepSeekProvider extends BaseProvider {
  async chat(messages: AgentMessage[]): Promise<string> {
    const apiKey = this.config.apiKey || process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      throw new Error("DeepSeek API密钥未配置")
    }

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || "deepseek-chat",
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: this.config.temperature ?? 0.7,
        max_tokens: this.config.maxTokens,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`DeepSeek API错误: ${error.error?.message || response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ""
  }

  async *streamChat(messages: AgentMessage[]): AsyncGenerator<string, void, unknown> {
    const apiKey = this.config.apiKey || process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      throw new Error("DeepSeek API密钥未配置")
    }

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || "deepseek-chat",
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: this.config.temperature ?? 0.7,
        max_tokens: this.config.maxTokens,
        stream: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API错误: ${response.statusText}`)
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
            const content = json.choices[0]?.delta?.content
            if (content) {
              yield content
            }
          } catch (e) {
          }
        }
      }
    }
  }
}

