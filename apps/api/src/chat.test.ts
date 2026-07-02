import { describe, expect, it, vi } from "vitest";

const { sendMessage } = vi.hoisted(() => ({ sendMessage: vi.fn() }));

vi.mock("./lib/Claude/index.ts", () => ({
  Claude: class {
    sendMessage = sendMessage;
  },
}));

import { chatRoute } from "./chat.ts";

const postChat = (body: unknown) =>
  chatRoute.handle(
    new Request("http://localhost/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

describe("POST /chat", () => {
  it("routes to the assistant agent with compiled prompts and tools", async () => {
    sendMessage.mockResolvedValue("Break a leg!");

    const res = await postChat({ messages: [{ role: "user", content: "Any tips?" }] });
    const body = (await res.json()) as { response: string };

    expect(res.status).toBe(200);
    expect(body.response).toBe("Break a leg!");
    expect(sendMessage).toHaveBeenCalledWith(
      [{ role: "user", content: "Any tips?" }],
      expect.objectContaining({
        system: expect.stringMatching(/\S/),
        tools: expect.arrayContaining([expect.objectContaining({ name: "test" })]),
      }),
    );
  });

  it("rejects an unknown agent with 404 and never calls Claude", async () => {
    sendMessage.mockClear();

    const res = await postChat({ agent: "nope", messages: [{ role: "user", content: "hi" }] });
    const body = (await res.json()) as { error: string };

    expect(res.status).toBe(404);
    expect(body.error).toBe("Unknown agent: nope");
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("rejects an empty messages array", async () => {
    const res = await postChat({ messages: [] });
    expect(res.status).toBe(422);
  });

  it("rejects an invalid role", async () => {
    const res = await postChat({ messages: [{ role: "system", content: "hi" }] });
    expect(res.status).toBe(422);
  });
});
