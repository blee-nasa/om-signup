import type { z } from "zod";

const Sonnet = "claude-sonnet-5";
const Opus = "claude-opus-4-8";
const Haiku = "claude-haiku-4-5";
const Fable = "claude-fable-5";

export type ClaudeModel = typeof Sonnet | typeof Opus | typeof Haiku | typeof Fable;

export const ClaudeModels = { Sonnet, Opus, Haiku, Fable } as const;

export const ClaudeMaxTokens: Record<ClaudeModel, number> = {
  [Sonnet]: 128000,
  [Opus]: 128000,
  [Haiku]: 64000,
  [Fable]: 128000,
};

export type MessageRole = "user" | "assistant";

export type ClaudeMessage = { role: MessageRole; content: string };

export type ToolContext = { stop: boolean };

export type ToolSpec<Input = any> = {
  name: string;
  description: string;
  schema: z.ZodObject<z.ZodRawShape>;
  run: (input: Input, ctx?: ToolContext) => Promise<string>;
};

export type ClaudeSendOptions = { model?: ClaudeModel; system?: string; tools?: ToolSpec[] };
