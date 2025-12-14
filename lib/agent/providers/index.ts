import { BaseProvider } from "./base"
import { OpenAIProvider } from "./openai"
import { AnthropicProvider } from "./anthropic"
import { DeepSeekProvider } from "./deepseek"
import { KimiProvider } from "./kimi"
import { CustomProvider } from "./custom"
import { Provider, AgentConfig } from "../types"

export function createProvider(provider: Provider, config: AgentConfig): BaseProvider {
  switch (provider) {
    case "openai":
      return new OpenAIProvider(config)
    case "anthropic":
      return new AnthropicProvider(config)
    case "deepseek":
      return new DeepSeekProvider(config)
    case "kimi":
      return new KimiProvider(config)
    case "custom":
      return new CustomProvider(config)
    default:
      throw new Error(`不支持的提供者: ${provider}`)
  }
}

