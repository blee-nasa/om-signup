import { AnthropicClient } from "./AnthropicClient.ts";
import { LocalClient } from "./LocalClient.ts";
import type { ClaudeMessage, ClaudeSendOptions } from "./types.ts";

export class Claude {
  client: AnthropicClient | LocalClient;

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.client = new AnthropicClient();
    } else {
      this.client = new LocalClient();
    }
  }

  async sendMessage(messages: ClaudeMessage[], options?: ClaudeSendOptions): Promise<string> {
    return this.client.sendMessage(messages, options);
  }
}
