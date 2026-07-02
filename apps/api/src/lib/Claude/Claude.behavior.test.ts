import { describe, expect, it } from "vitest";
import { Claude } from "./Claude.ts";

describe("Claude behavior (live)", () => {
  it.skipIf(process.env.CI)(
    "responds through the local Claude installation or the API",
    async () => {
      const claude = new Claude();
      const response = await claude.sendMessage([
        { role: "user", content: "Reply with exactly the word PONG and nothing else." },
      ]);
      expect(response).toMatch(/pong/i);
    },
    60_000,
  );
});
