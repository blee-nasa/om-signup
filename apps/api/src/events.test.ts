import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApi } from "./app.ts";
import { db } from "./db/index.ts";
import { events, signups } from "./db/schema.ts";
import { eventMode, SIGNUP_WINDOW_MS } from "./events.ts";
import { startTestMode, stopTestMode } from "./test-mode.ts";

const app = createApi();
const get = (path: string) => app.handle(new Request(`http://localhost${path}`));
const post = (path: string, body: unknown) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
const postEmpty = (path: string) =>
  app.handle(new Request(`http://localhost${path}`, { method: "POST" }));

type SlotBody = {
  slots: Array<{
    slot: number;
    startsAt: string;
    signup: { name: string; act: string | null } | null;
    claiming: boolean;
  }>;
};

afterEach(() => {
  stopTestMode();
});

describe("eventMode", () => {
  const starts = Date.parse("2026-07-10T23:00:00Z");
  const ends = Date.parse("2026-07-11T01:00:00Z");
  const event = { startsAt: new Date(starts), endsAt: new Date(ends) };

  it("is upcoming more than 30 minutes before opening", () => {
    expect(eventMode(event, new Date(starts - SIGNUP_WINDOW_MS - 1))).toBe("upcoming");
  });

  it("is signup from 30 minutes before opening", () => {
    expect(eventMode(event, new Date(starts - SIGNUP_WINDOW_MS))).toBe("signup");
  });

  it("is signup while running and until 30 minutes after closing", () => {
    expect(eventMode(event, new Date(starts + 1))).toBe("signup");
    expect(eventMode(event, new Date(ends + SIGNUP_WINDOW_MS))).toBe("signup");
  });

  it("is expired past 30 minutes after closing", () => {
    expect(eventMode(event, new Date(ends + SIGNUP_WINDOW_MS + 1))).toBe("expired");
  });
});

describe("test mode routes", () => {
  it("serves a synthetic signup-mode event while active", async () => {
    startTestMode(30);
    const res = await get("/events/next");
    const body = (await res.json()) as {
      mode: string;
      event: { id: number; title: string; slotCount: number; slotMinutes: number };
    };
    expect(body.mode).toBe("signup");
    expect(body.event.id).toBe(0);
    expect(body.event.title).toBe("Open Mic (Test Mode)");
    expect(body.event.slotCount).toBe(9);
    expect(body.event.slotMinutes).toBe(20);
  });

  it("returns the configured number of empty slots in 20-minute steps", async () => {
    startTestMode(30);
    const res = await get("/events/0/signups");
    const body = (await res.json()) as SlotBody;
    expect(body.slots).toHaveLength(9);
    expect(body.slots.every((s) => s.signup === null)).toBe(true);
    const first = Date.parse(body.slots[0]!.startsAt);
    const second = Date.parse(body.slots[1]!.startsAt);
    expect(second - first).toBe(20 * 60_000);
  });

  it("claims a slot, rejects duplicates, and rejects out-of-range slots", async () => {
    startTestMode(30);
    const created = await post("/events/0/signups", { slot: 3, name: "Test Pilot", act: "demo" });
    expect(created.status).toBe(201);

    const duplicate = await post("/events/0/signups", { slot: 3, name: "Second" });
    expect(duplicate.status).toBe(409);

    const outOfRange = await post("/events/0/signups", { slot: 9, name: "Tenth" });
    expect(outOfRange.status).toBe(422);

    const res = await get("/events/0/signups");
    const body = (await res.json()) as SlotBody;
    expect(body.slots[3]?.signup).toMatchObject({ name: "Test Pilot", act: "demo" });
  });

  it("404s the test event when test mode is inactive", async () => {
    const res = await get("/events/0/signups");
    expect(res.status).toBe(404);
  });

  it("marks a slot as claiming until it's released", async () => {
    startTestMode(30);
    const claimed = await postEmpty("/events/0/signups/2/claim");
    expect(claimed.status).toBe(200);

    const midway = await get("/events/0/signups");
    const midwayBody = (await midway.json()) as SlotBody;
    expect(midwayBody.slots[2]).toMatchObject({ signup: null, claiming: true });

    const released = await postEmpty("/events/0/signups/2/release");
    expect(released.status).toBe(200);

    const after = await get("/events/0/signups");
    const afterBody = (await after.json()) as SlotBody;
    expect(afterBody.slots[2]).toMatchObject({ signup: null, claiming: false });
  });

  it("409s a claim on an already-taken slot", async () => {
    startTestMode(30);
    await post("/events/0/signups", { slot: 3, name: "Test Pilot" });
    const claimed = await postEmpty("/events/0/signups/3/claim");
    expect(claimed.status).toBe(409);
  });

  it("422s a claim on an out-of-range slot", async () => {
    startTestMode(30);
    const claimed = await postEmpty("/events/0/signups/9/claim");
    expect(claimed.status).toBe(422);
  });

  it("404s a claim when test mode is inactive", async () => {
    const claimed = await postEmpty("/events/0/signups/0/claim");
    expect(claimed.status).toBe(404);
  });
});

describe.skipIf(!process.env.DATABASE_URL || !process.env.DB_TESTS)("events routes (db)", () => {
  const clear = async () => {
    await db!.delete(signups);
    await db!.delete(events);
  };

  beforeAll(clear);
  afterAll(clear);

  it("returns none when nothing is scheduled", async () => {
    const res = await get("/events/next");
    expect(await res.json()).toEqual({ mode: "none", event: null });
  });

  it("returns upcoming for a future event with its slot config", async () => {
    const startsAt = new Date(Date.now() + 2 * 24 * 60 * 60_000);
    const endsAt = new Date(startsAt.getTime() + 3 * 60 * 60_000);
    await db!.insert(events).values({ title: "Future Night", startsAt, endsAt });

    const res = await get("/events/next");
    const body = (await res.json()) as {
      mode: string;
      event: { title: string; slotCount: number; slotMinutes: number };
    };
    expect(body.mode).toBe("upcoming");
    expect(body.event.title).toBe("Future Night");
    expect(body.event.slotCount).toBe(9);
    expect(body.event.slotMinutes).toBe(20);
  });

  it("rejects signups while the window is closed", async () => {
    const res = await get("/events/next");
    const body = (await res.json()) as { event: { id: number } };
    const rejected = await post(`/events/${body.event.id}/signups`, { slot: 0, name: "Too Early" });
    expect(rejected.status).toBe(409);
  });

  it("returns signup for the soonest event within its window", async () => {
    const startsAt = new Date(Date.now() + 10 * 60_000);
    const endsAt = new Date(startsAt.getTime() + 3 * 60 * 60_000);
    await db!.insert(events).values({ title: "Tonight", startsAt, endsAt });

    const res = await get("/events/next");
    const body = (await res.json()) as { mode: string; event: { title: string } };
    expect(body.mode).toBe("signup");
    expect(body.event.title).toBe("Tonight");
  });

  it("claims slots during the window and reflects them in the sheet", async () => {
    const res = await get("/events/next");
    const { event } = (await res.json()) as { event: { id: number } };

    const first = await post(`/events/${event.id}/signups`, { slot: 0, name: "Ada", act: "standup" });
    expect(first.status).toBe(201);
    const second = await post(`/events/${event.id}/signups`, { slot: 4, name: "Grace" });
    expect(second.status).toBe(201);

    const list = await get(`/events/${event.id}/signups`);
    const body = (await list.json()) as SlotBody;
    expect(body.slots).toHaveLength(9);
    expect(body.slots[0]?.signup).toMatchObject({ name: "Ada", act: "standup" });
    expect(body.slots[4]?.signup).toMatchObject({ name: "Grace", act: null });
    expect(body.slots[1]?.signup).toBeNull();
  });

  it("409s a duplicate slot claim", async () => {
    const res = await get("/events/next");
    const { event } = (await res.json()) as { event: { id: number } };
    const duplicate = await post(`/events/${event.id}/signups`, { slot: 0, name: "Late Ada" });
    expect(duplicate.status).toBe(409);
  });

  it("422s an out-of-range slot", async () => {
    const res = await get("/events/next");
    const { event } = (await res.json()) as { event: { id: number } };
    const rejected = await post(`/events/${event.id}/signups`, { slot: 9, name: "Tenth" });
    expect(rejected.status).toBe(422);
  });

  it("marks a slot as claiming until it's released, and 409s a claim on a taken slot", async () => {
    const res = await get("/events/next");
    const { event } = (await res.json()) as { event: { id: number } };

    const claimed = await postEmpty(`/events/${event.id}/signups/1/claim`);
    expect(claimed.status).toBe(200);

    const midway = await get(`/events/${event.id}/signups`);
    const midwayBody = (await midway.json()) as SlotBody;
    expect(midwayBody.slots[1]).toMatchObject({ signup: null, claiming: true });

    const released = await postEmpty(`/events/${event.id}/signups/1/release`);
    expect(released.status).toBe(200);

    const after = await get(`/events/${event.id}/signups`);
    const afterBody = (await after.json()) as SlotBody;
    expect(afterBody.slots[1]).toMatchObject({ signup: null, claiming: false });

    const claimTaken = await postEmpty(`/events/${event.id}/signups/0/claim`);
    expect(claimTaken.status).toBe(409);
  });

  it("honors per-event slot configuration", async () => {
    await clear();
    const startsAt = new Date(Date.now() + 5 * 60_000);
    const endsAt = new Date(startsAt.getTime() + 75 * 60_000);
    await db!
      .insert(events)
      .values({ title: "Short Night", startsAt, endsAt, slotCount: 5, slotMinutes: 15 });

    const next = await get("/events/next");
    const { event } = (await next.json()) as { event: { id: number; slotCount: number } };
    expect(event.slotCount).toBe(5);

    const list = await get(`/events/${event.id}/signups`);
    const body = (await list.json()) as SlotBody;
    expect(body.slots).toHaveLength(5);
    const first = Date.parse(body.slots[0]!.startsAt);
    const second = Date.parse(body.slots[1]!.startsAt);
    expect(second - first).toBe(15 * 60_000);

    const rejected = await post(`/events/${event.id}/signups`, { slot: 5, name: "Sixth" });
    expect(rejected.status).toBe(422);
  });

  it("prefers a still-open event over a just-ended one in its grace window", async () => {
    await clear();
    const now = Date.now();
    // Event A ended 5 minutes ago (still in its 30m grace); Event B started 5 minutes ago.
    await db!.insert(events).values({
      title: "Just Ended",
      startsAt: new Date(now - 125 * 60_000),
      endsAt: new Date(now - 5 * 60_000),
    });
    await db!.insert(events).values({
      title: "Running Now",
      startsAt: new Date(now - 5 * 60_000),
      endsAt: new Date(now + 115 * 60_000),
    });

    const res = await get("/events/next");
    const body = (await res.json()) as { mode: string; event: { title: string } };
    expect(body.event.title).toBe("Running Now");
    expect(body.mode).toBe("signup");
  });

  it("rejects a non-integer event id with 404 rather than a 500", async () => {
    const res = await get("/events/1.5/signups");
    expect(res.status).toBe(404);
  });

  it("404s an unknown event", async () => {
    const res = await get("/events/999999/signups");
    expect(res.status).toBe(404);
  });
});
