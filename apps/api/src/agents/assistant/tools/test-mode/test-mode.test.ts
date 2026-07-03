import { afterEach, describe, expect, it } from "vitest";
import { stopTestMode, testModeEvent } from "../../../../test-mode.ts";
import { startTestModeTool, stopTestModeTool } from "./test-mode.ts";

afterEach(() => {
  stopTestMode();
});

describe("test mode tools", () => {
  it("start_test_mode activates test mode for the requested duration", async () => {
    const message = await startTestModeTool.run({ minutes: 5 });
    expect(message).toContain("5 minutes");
    expect(testModeEvent()).not.toBeNull();
  });

  it("start_test_mode defaults to 30 minutes", async () => {
    const message = await startTestModeTool.run({});
    expect(message).toContain("30 minutes");
  });

  it("stop_test_mode deactivates and reports prior state", async () => {
    await startTestModeTool.run({});
    await expect(stopTestModeTool.run({})).resolves.toContain("stopped");
    expect(testModeEvent()).toBeNull();
    await expect(stopTestModeTool.run({})).resolves.toContain("not active");
  });
});
