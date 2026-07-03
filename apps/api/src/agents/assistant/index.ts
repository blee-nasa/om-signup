import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { Agent } from "../Agent.ts";
import { assistantTools } from "./tools/index.ts";

const read = (name: string) =>
  readFileSync(fileURLToPath(new URL(`./prompts/${name}.prompt.md`, import.meta.url)), "utf-8").trimEnd();

const prompts = ["preamble", "test-mode"].map(read);

export class AssistantAgent extends Agent {
  constructor() {
    super({ prompts, tools: assistantTools });
  }
}
