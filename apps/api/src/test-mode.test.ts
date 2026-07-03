import { afterEach, describe, expect, it } from "vitest";
import {
  addTestSignup,
  listTestSignups,
  startTestMode,
  stopTestMode,
  TEST_EVENT_ID,
  testModeEvent,
} from "./test-mode.ts";

afterEach(() => {
  stopTestMode();
});

describe("test mode", () => {
  it("is inactive by default", () => {
    expect(testModeEvent()).toBeNull();
    expect(listTestSignups()).toEqual([]);
    expect(addTestSignup(0, "Nobody", null)).toEqual({ ok: false, reason: "inactive" });
  });

  it("starts with a synthetic event carrying slot config and clamps the duration", () => {
    const now = new Date("2026-07-10T20:00:00Z");
    const { minutes } = startTestMode(999, now);
    expect(minutes).toBe(120);
    const event = testModeEvent(now);
    expect(event).toMatchObject({
      id: TEST_EVENT_ID,
      title: "Open Mic (Test Mode)",
      slotCount: 9,
      slotMinutes: 20,
    });
    expect(event!.endsAt.getTime() - event!.startsAt.getTime()).toBe(120 * 60_000);
  });

  it("defaults to 30 minutes", () => {
    const now = new Date("2026-07-10T20:00:00Z");
    const { minutes, endsAt } = startTestMode(undefined, now);
    expect(minutes).toBe(30);
    expect(endsAt.getTime()).toBe(now.getTime() + 30 * 60_000);
  });

  it("claims slots and rejects duplicates", () => {
    startTestMode(30);
    expect(addTestSignup(3, "Ada", "standup")).toMatchObject({
      ok: true,
      signup: { slot: 3, name: "Ada", act: "standup" },
    });
    expect(addTestSignup(3, "Grace", null)).toEqual({ ok: false, reason: "taken" });
    expect(addTestSignup(5, "Grace", null)).toMatchObject({ ok: true, signup: { slot: 5 } });
    expect(listTestSignups().map((s) => [s.slot, s.name])).toEqual([
      [3, "Ada"],
      [5, "Grace"],
    ]);
  });

  it("expires automatically after the duration", () => {
    const now = new Date("2026-07-10T20:00:00Z");
    startTestMode(30, now);
    const later = new Date(now.getTime() + 31 * 60_000);
    expect(testModeEvent(later)).toBeNull();
    expect(listTestSignups(later)).toEqual([]);
  });

  it("stops on demand and reports whether it was active", () => {
    startTestMode(30);
    expect(stopTestMode()).toBe(true);
    expect(stopTestMode()).toBe(false);
    expect(testModeEvent()).toBeNull();
  });
});
