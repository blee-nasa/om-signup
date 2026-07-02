import { createSdkMcpServer, query, tool } from "@anthropic-ai/claude-agent-sdk";

import type { ClaudeMessage, ClaudeSendOptions, ToolContext, ToolSpec } from "./types.ts";

const MCP_SERVER = "tools";

const toSdkTool = (spec: ToolSpec, ctx: ToolContext) =>
  tool(spec.name, spec.description, spec.schema.shape, async (args) => {
    try {
      return { content: [{ type: "text" as const, text: await spec.run(args, ctx) }] };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: error instanceof Error ? error.message : String(error) }],
        isError: true,
      };
    }
  });

export class LocalClient {
  async sendMessage(messages: ClaudeMessage[], options: ClaudeSendOptions = {}): Promise<string> {
    const prompt = messages.map((message) => `${message.role}: ${message.content}`).join("\n\n");
    const tools = options.tools ?? [];
    const ctx: ToolContext = { stop: false };

    const mcpServers = tools.length
      ? {
          [MCP_SERVER]: createSdkMcpServer({
            name: MCP_SERVER,
            version: "1.0.0",
            tools: tools.map((t) => toSdkTool(t, ctx)),
          }),
        }
      : undefined;

    for await (const message of query({
      prompt,
      options: {
        model: options.model,
        systemPrompt: options.system,
        settingSources: [],
        permissionMode: "dontAsk",
        ...(mcpServers ? { mcpServers } : {}),
        allowedTools: tools.map((t) => `mcp__${MCP_SERVER}__${t.name}`),
      },
    })) {
      if (message.type === "result") {
        if (message.subtype === "success") {
          return message.result;
        }
        throw new Error(`LocalClient query failed: ${message.subtype}`);
      }
    }
    throw new Error("LocalClient query ended without a result message");
  }
}
