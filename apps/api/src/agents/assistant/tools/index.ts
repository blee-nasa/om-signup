import type { ToolSpec } from "../../../lib/Claude/index.ts";
import { testTool } from "./test-tool/index.ts";

export { testTool };

export const assistantTools: ToolSpec[] = [testTool];
