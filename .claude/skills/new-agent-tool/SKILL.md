---
name: new-agent-tool
description: Add a new tool to this repo's AI Assistant agent so it can be called from chat. Scaffolds the tool's folder (spec + barrel + test) and registers it, matching the project's exact tool pattern. Use when asked to create, add, scaffold, or make a new agent tool, assistant tool, or chat tool.
model: haiku
argument-hint: what the tool does and its inputs (e.g. "a coin_flip tool", "greet_audience that takes a name")
---

# New Agent Tool

Add one tool to the AI Assistant agent. Every tool in this repo lives
in its own folder under `apps/api/src/agents/assistant/tools/` and is made of
**three files plus one registration edit**. Follow the steps in order. Do not
improvise — the templates below are exact. Copy them and only replace the
`<...>` placeholders.

This project bans comments in generated code. Do **not** add any code comments.

## Step 0 — Derive the names (one source of truth)

Everything derives from a single **TOOL_NAME** in `snake_case`. If the user gave a
name, lower-snake_case it. If not, pick a short `verb_noun` describing the tool
(e.g. "flip a coin" → `flip_coin`).

From TOOL_NAME compute the other four names exactly like this table:

| TOOL_NAME (snake) | `<dir>` and `<file>` (hyphens) | `<exportName>` (camelCase + `Tool`) | `<tool_name>` (name field) |
| ----------------- | ------------------------------ | ----------------------------------- | -------------------------- |
| `flip_coin`       | `flip-coin`                    | `flipCoinTool`                      | `flip_coin`                |
| `tell_joke`       | `tell-joke`                    | `tellJokeTool`                      | `tell_joke`                |
| `pick_stage_name` | `pick-stage-name`              | `pickStageNameTool`                 | `pick_stage_name`          |

Rules:
- `<dir>` and `<file>` = TOOL_NAME with every `_` replaced by `-`.
- `<exportName>` = TOOL_NAME camelCased (drop underscores, capitalize each word
  after the first) with `Tool` appended.
- `<tool_name>` (the value of the `name:` field) = TOOL_NAME unchanged.

Write these five values down before continuing and use them verbatim below.

## Step 1 — Decide the input schema

Pick ONE of two shapes:

- **No inputs** (the tool needs no arguments) → use Template A.
- **Has inputs** (the tool needs values from the user) → use Template B, and for
  each input add one line to the `z.object({...})`. Common field types:
  - `z.string().describe("...")`
  - `z.number().int().describe("...")`
  - add `.optional()` before `.describe(...)` if the field is optional.

## Step 2 — Create the three files

Create the folder `apps/api/src/agents/assistant/tools/<dir>/` and write these
three files. The import path `../../../../lib/Claude/index.ts` has exactly four
`../` — do not change it.

### File 1 — `apps/api/src/agents/assistant/tools/<dir>/<file>.ts`

**Template A (no inputs):**

```ts
import { z } from "zod";
import type { ToolSpec } from "../../../../lib/Claude/index.ts";

const schema = z.object({});

export const <exportName>: ToolSpec<z.infer<typeof schema>> = {
  name: "<tool_name>",
  description: "<Call this when the user asks to ... . Say what the tool returns.>",
  schema,
  run: () => Promise.resolve("<the result string the assistant will read>"),
};
```

**Template B (has inputs):**

```ts
import { z } from "zod";
import type { ToolSpec } from "../../../../lib/Claude/index.ts";

const schema = z.object({
  <field>: z.string().describe("<what this field is>"),
});

export const <exportName>: ToolSpec<z.infer<typeof schema>> = {
  name: "<tool_name>",
  description: "<Call this when the user asks to ... . Say what the tool returns.>",
  schema,
  run: (input) => Promise.resolve(`<result string that uses ${input.<field>}>`),
};
```

The `description` is the ONLY thing that tells the AI Assistant when to call this tool —
phrase it as "Call this when the user asks to …" and name what it returns. `run`
must return a `Promise<string>`.

### File 2 — `apps/api/src/agents/assistant/tools/<dir>/index.ts`

```ts
export { <exportName> } from "./<file>.ts";
```

### File 3 — `apps/api/src/agents/assistant/tools/<dir>/<file>.test.ts`

For Template A (no inputs), `<sampleInput>` is `{}`. For Template B, use
`{ <field>: "..." }` with a real sample value.

```ts
import { describe, expect, it } from "vitest";
import { <exportName> } from "./<file>.ts";

describe("<exportName>", () => {
  it("returns a string", async () => {
    const result = await <exportName>.run(<sampleInput>);
    expect(typeof result).toBe("string");
  });
});
```

## Step 3 — Register the tool

Edit the existing file `apps/api/src/agents/assistant/tools/index.ts`. Make three
small additions — keep every line that is already there.

1. Add an import line with the other tool imports:
   ```ts
   import { <exportName> } from "./<dir>/index.ts";
   ```
2. Add `<exportName>` to the `export { ... }` list.
3. Add `<exportName>` to the `assistantTools` array.

**Worked example.** If TOOL_NAME is `flip_coin`, the file changes from:

```ts
import type { ToolSpec } from "../../../lib/Claude/index.ts";
import { testTool } from "./test-tool/index.ts";
import { startTestModeTool, stopTestModeTool } from "./test-mode/index.ts";

export { testTool, startTestModeTool, stopTestModeTool };

export const assistantTools: ToolSpec[] = [testTool, startTestModeTool, stopTestModeTool];
```

to:

```ts
import type { ToolSpec } from "../../../lib/Claude/index.ts";
import { testTool } from "./test-tool/index.ts";
import { startTestModeTool, stopTestModeTool } from "./test-mode/index.ts";
import { flipCoinTool } from "./flip-coin/index.ts";

export { testTool, startTestModeTool, stopTestModeTool, flipCoinTool };

export const assistantTools: ToolSpec[] = [testTool, startTestModeTool, stopTestModeTool, flipCoinTool];
```

## Step 4 — Verify

Run both from the repo root:

1. Typecheck: `bun run --cwd apps/api typecheck` — must exit 0.
2. Test the new tool: `bunx vitest run apps/api/src/agents/assistant/tools/<dir>/<file>.test.ts` — must pass.

If typecheck fails, re-check that the import path has four `../`, the file/folder
names match `<dir>`/`<file>` exactly, and `tools/index.ts` still lists every
original tool. Fix and re-run until both pass.

## Done

Report the created files, the `<tool_name>` the AI Assistant now responds to, and one
example sentence a user could type in the chat to trigger it (matching your
`description`).

## Guardrails

- Touch only: the new `<dir>/` folder (three files) and `tools/index.ts`. Nothing
  else — not prompts, not the agent, not the client.
- Never delete or rename existing tools when editing `tools/index.ts`.
- No code comments anywhere.
- Do not add a `model` field, extra exports, or any file beyond the three.
