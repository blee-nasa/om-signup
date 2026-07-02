import { afterEach, describe, expect, it, vi } from "vitest";
import { AnthropicClient } from "./AnthropicClient.ts";
import { Claude } from "./Claude.ts";
import { LocalClient } from "./LocalClient.ts";

afterEach(() => vi.unstubAllEnvs());

describe("Claude", () => {
  it("uses the AnthropicClient when ANTHROPIC_API_KEY is set", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    expect(new Claude().client).toBeInstanceOf(AnthropicClient);
  });

  it("uses the LocalClient when no API key is set", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(new Claude().client).toBeInstanceOf(LocalClient);
  });
});
