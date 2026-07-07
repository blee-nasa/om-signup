import { describe, expect, it } from "vitest";
import { getVenueWifiTool } from "./get-venue-wifi.ts";

describe("getVenueWifiTool", () => {
  it("returns a string", async () => {
    const result = await getVenueWifiTool.run({});
    expect(typeof result).toBe("string");
  });
});
