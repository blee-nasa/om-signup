import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { ToolSpec } from "./types.ts";

afterEach(() => {
  vi.doUnmock("@anthropic-ai/claude-agent-sdk");
  vi.resetModules();
});

describe("LocalClient", () => {
  it("returns the result text on success without tools", async () => {
    const query = vi.fn(async function* () {
      yield { type: "result", subtype: "success", result: "local response" };
    });
    vi.doMock("@anthropic-ai/claude-agent-sdk", () => ({ query, tool: vi.fn(), createSdkMcpServer: vi.fn() }));
    vi.resetModules();
    const { LocalClient } = await import("./LocalClient.ts");

    const client = new LocalClient();
    const result = await client.sendMessage([{ role: "user", content: "hi" }]);

    expect(result).toBe("local response");
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({ options: expect.objectContaining({ allowedTools: [] }) }),
    );
  });

  it("wires tools into an mcp server and allowedTools when tools are provided", async () => {
    const query = vi.fn(async function* () {
      yield { type: "result", subtype: "success", result: "ok" };
    });
    const createSdkMcpServer = vi.fn().mockReturnValue("mcp-server-instance");
    const tool = vi.fn((name: string, description: string, shape: unknown, handler: unknown) => ({
      name,
      description,
      shape,
      handler,
    }));
    vi.doMock("@anthropic-ai/claude-agent-sdk", () => ({ query, tool, createSdkMcpServer }));
    vi.resetModules();
    const { LocalClient } = await import("./LocalClient.ts");

    const spec: ToolSpec = {
      name: "test",
      description: "a test tool",
      schema: z.object({}),
      run: async () => "true",
    };
    const client = new LocalClient();
    await client.sendMessage([{ role: "user", content: "hi" }], { tools: [spec] });

    expect(createSdkMcpServer).toHaveBeenCalledWith(
      expect.objectContaining({ name: "tools", tools: expect.any(Array) }),
    );
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          allowedTools: ["mcp__tools__test"],
          mcpServers: { tools: "mcp-server-instance" },
        }),
      }),
    );
  });

  it("wraps a thrown tool error as isError content", async () => {
    const query = vi.fn(async function* () {
      yield { type: "result", subtype: "success", result: "ok" };
    });
    let capturedHandler: ((args: unknown) => Promise<unknown>) | undefined;
    const tool = vi.fn(
      (_name: string, _description: string, _shape: unknown, handler: (args: unknown) => Promise<unknown>) => {
        capturedHandler = handler;
        return {};
      },
    );
    const createSdkMcpServer = vi.fn().mockReturnValue({});
    vi.doMock("@anthropic-ai/claude-agent-sdk", () => ({ query, tool, createSdkMcpServer }));
    vi.resetModules();
    const { LocalClient } = await import("./LocalClient.ts");

    const spec: ToolSpec = {
      name: "boom",
      description: "throws",
      schema: z.object({}),
      run: async () => {
        throw new Error("kaboom");
      },
    };
    const client = new LocalClient();
    await client.sendMessage([{ role: "user", content: "hi" }], { tools: [spec] });

    const result = await capturedHandler!({});
    expect(result).toEqual({ content: [{ type: "text", text: "kaboom" }], isError: true });
  });

  it("throws when the query fails", async () => {
    const query = vi.fn(async function* () {
      yield { type: "result", subtype: "error_max_turns" };
    });
    vi.doMock("@anthropic-ai/claude-agent-sdk", () => ({ query, tool: vi.fn(), createSdkMcpServer: vi.fn() }));
    vi.resetModules();
    const { LocalClient } = await import("./LocalClient.ts");

    const client = new LocalClient();
    await expect(client.sendMessage([{ role: "user", content: "hi" }])).rejects.toThrow(
      "LocalClient query failed: error_max_turns",
    );
  });

  it("throws when the query ends without a result message", async () => {
    const query = vi.fn(async function* () {
      yield { type: "system" };
    });
    vi.doMock("@anthropic-ai/claude-agent-sdk", () => ({ query, tool: vi.fn(), createSdkMcpServer: vi.fn() }));
    vi.resetModules();
    const { LocalClient } = await import("./LocalClient.ts");

    const client = new LocalClient();
    await expect(client.sendMessage([{ role: "user", content: "hi" }])).rejects.toThrow(
      "LocalClient query ended without a result message",
    );
  });
});
