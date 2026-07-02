import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.doUnmock("./lib/Claude/index.ts");
  vi.resetModules();
});

const mockClaude = (sendMessage: ReturnType<typeof vi.fn>) => {
  vi.doMock("./lib/Claude/index.ts", () => ({
    Claude: class {
      sendMessage = sendMessage;
    },
    ClaudeModels: { Haiku: "claude-haiku-4-5" },
  }));
  vi.resetModules();
};

describe("checkAnthropic", () => {
  it("returns reachable:true when the facade responds, using Haiku", async () => {
    const sendMessage = vi.fn().mockResolvedValue("pong");
    mockClaude(sendMessage);
    const { checkAnthropic } = await import("./anthropic-probe.ts");

    await expect(checkAnthropic(1000)).resolves.toEqual({ reachable: true });
    expect(sendMessage).toHaveBeenCalledWith(
      [{ role: "user", content: "ping" }],
      expect.objectContaining({ model: "claude-haiku-4-5" }),
    );
  });

  it("returns reachable:false when the facade throws", async () => {
    const sendMessage = vi.fn().mockRejectedValue(new Error("no backend"));
    mockClaude(sendMessage);
    const { checkAnthropic } = await import("./anthropic-probe.ts");

    await expect(checkAnthropic(1000)).resolves.toEqual({ reachable: false });
  });

  it("caches the result within the TTL window and refreshes after it", async () => {
    const sendMessage = vi.fn().mockResolvedValue("pong");
    mockClaude(sendMessage);
    const { checkAnthropic } = await import("./anthropic-probe.ts");

    await checkAnthropic(0);
    await checkAnthropic(30_000);
    expect(sendMessage).toHaveBeenCalledOnce();

    await checkAnthropic(61_000);
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });
});
