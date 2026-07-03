import { z } from "zod";
import type { ToolSpec } from "../../../../lib/Claude/index.ts";

const schema = z.object({});

export const testTool: ToolSpec<z.infer<typeof schema>> = {
  name: "test",
  description:
    "A no-op wiring-check tool that always returns true. Not related to the app's test mode — for that, use start_test_mode.",
  schema,
  run: () => Promise.resolve("true"),
};
