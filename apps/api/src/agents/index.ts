import { Agent } from "./Agent.ts";
import { AssistantAgent } from "./assistant/index.ts";

export { Agent } from "./Agent.ts";
export type { AgentConfig } from "./Agent.ts";
export { AssistantAgent } from "./assistant/index.ts";

export const agentRegistry: Record<string, () => Agent> = {
  assistant: () => new AssistantAgent(),
};
