import type { ToolSpec } from "../../../lib/Claude/index.ts";
import { testTool } from "./test-tool/index.ts";
import { startTestModeTool, stopTestModeTool } from "./test-mode/index.ts";

export { testTool, startTestModeTool, stopTestModeTool };

export const assistantTools: ToolSpec[] = [testTool, startTestModeTool, stopTestModeTool];
