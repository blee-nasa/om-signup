import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import {
  ClaudeMaxTokens,
  ClaudeModels,
  type ClaudeMessage,
  type ClaudeSendOptions,
  type ToolContext,
  type ToolSpec,
} from "./types.ts";

const MAX_TOOL_TURNS = 8;

const toAnthropicTool = (tool: ToolSpec): Anthropic.Tool => ({
  name: tool.name,
  description: tool.description,
  input_schema: z.toJSONSchema(tool.schema) as Anthropic.Tool.InputSchema,
});

const textOf = (content: Anthropic.ContentBlock[]): string =>
  content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

export class AnthropicClient {
  private client = new Anthropic();

  async sendMessage(messages: ClaudeMessage[], options: ClaudeSendOptions = {}): Promise<string> {
    const model = options.model ?? ClaudeModels.Opus;
    const tools = options.tools ?? [];
    const byName = new Map(tools.map((tool) => [tool.name, tool]));
    const conversation: Anthropic.MessageParam[] = messages;
    const ctx: ToolContext = { stop: false };

    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const stream = this.client.messages.stream({
        model,
        max_tokens: ClaudeMaxTokens[model],
        system: options.system,
        ...(tools.length ? { tools: tools.map(toAnthropicTool) } : {}),
        messages: conversation,
      });
      const message = await stream.finalMessage();

      if (message.stop_reason !== "tool_use") {
        const block = message.content[0];
        if (block?.type !== "text") {
          throw new Error(`AnthropicClient received a non-text response: ${block?.type}`);
        }
        return block.text;
      }

      conversation.push({ role: "assistant", content: message.content });

      const toolResults = await Promise.all(
        message.content
          .filter((block): block is Anthropic.ToolUseBlock => block.type === "tool_use")
          .map(async (block): Promise<Anthropic.ToolResultBlockParam> => {
            const tool = byName.get(block.name);
            if (!tool) {
              return {
                type: "tool_result",
                tool_use_id: block.id,
                content: `Unknown tool: ${block.name}`,
                is_error: true,
              };
            }
            try {
              return { type: "tool_result", tool_use_id: block.id, content: await tool.run(block.input, ctx) };
            } catch (error) {
              return {
                type: "tool_result",
                tool_use_id: block.id,
                content: error instanceof Error ? error.message : String(error),
                is_error: true,
              };
            }
          }),
      );
      conversation.push({ role: "user", content: toolResults });

      if (ctx.stop) {
        return textOf(message.content);
      }
    }

    throw new Error(`AnthropicClient exceeded ${MAX_TOOL_TURNS} tool-use turns`);
  }
}
