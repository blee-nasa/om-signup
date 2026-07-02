import { z } from "zod";
import type { ToolSpec } from "../../../../lib/Claude/index.ts";

const schema = z.object({});

export const testTool: ToolSpec<z.infer<typeof schema>> = {
  name: "test",
  description: "A no-op test tool that always returns true. Used to verify tool wiring.",
  schema,
  run: () => Promise.resolve("true"),
};
