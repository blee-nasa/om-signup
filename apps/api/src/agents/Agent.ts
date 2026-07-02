import { Claude } from "../lib/Claude/index.ts";
import type { ClaudeMessage, ClaudeModel, ToolSpec } from "../lib/Claude/index.ts";

export type AgentConfig = {
  prompts?: string[];
  tools?: ToolSpec[];
  model?: ClaudeModel;
};

export class Agent {
  private claude = new Claude();

  constructor(private readonly config: AgentConfig = {}) {}

  get system(): string | undefined {
    return this.config.prompts?.length ? this.config.prompts.join("\n\n") : undefined;
  }

  respond(messages: ClaudeMessage[]): Promise<string> {
    return this.claude.sendMessage(messages, {
      model: this.config.model,
      system: this.system,
      tools: this.config.tools,
    });
  }
}
