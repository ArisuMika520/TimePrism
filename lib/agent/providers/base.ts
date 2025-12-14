import { AgentMessage, AgentConfig } from "../types"

export abstract class BaseProvider {
  protected config: AgentConfig

  constructor(config: AgentConfig) {
    this.config = config
  }

  abstract chat(messages: AgentMessage[]): Promise<string>
  abstract streamChat(messages: AgentMessage[]): AsyncGenerator<string, void, unknown>
}

