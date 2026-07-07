import type { ToolSpec } from "../../../lib/Claude/index.ts";
import { testTool } from "./test-tool/index.ts";
import { startTestModeTool, stopTestModeTool } from "./test-mode/index.ts";
import { getVenueWifiTool } from "./get-venue-wifi/index.ts";

export { testTool, startTestModeTool, stopTestModeTool, getVenueWifiTool };

export const assistantTools: ToolSpec[] = [testTool, startTestModeTool, stopTestModeTool, getVenueWifiTool];
