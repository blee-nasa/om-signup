import { describe, expect, it } from "vitest";
import { testTool } from "./test-tool.ts";

describe("testTool", () => {
  it("always returns true", async () => {
    await expect(testTool.run({})).resolves.toBe("true");
  });

  it("takes no input", () => {
    expect(Object.keys(testTool.schema.shape)).toEqual([]);
  });
});
