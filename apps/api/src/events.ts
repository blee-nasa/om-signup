import { asc, eq, gte } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "./db/index.ts";
import { events, signups } from "./db/schema.ts";
import { toSlots } from "./slots.ts";
import { addTestSignup, listTestSignups, TEST_EVENT_ID, testModeEvent } from "./test-mode.ts";

export const SIGNUP_WINDOW_MS = 30 * 60 * 1000;

type EventRow = typeof events.$inferSelect;

export type EventMode = "signup" | "upcoming" | "expired";

export const eventMode = (event: Pick<EventRow, "startsAt" | "endsAt">, now: Date): EventMode => {
  const at = now.getTime();
  if (at > event.endsAt.getTime() + SIGNUP_WINDOW_MS) return "expired";
  if (at >= event.startsAt.getTime() - SIGNUP_WINDOW_MS) return "signup";
  return "upcoming";
};

const toWire = (event: {
  id: number;
  title: string;
  startsAt: Date;
  endsAt: Date;
  slotCount: number;
  slotMinutes: number;
}) => ({
  id: event.id,
  title: event.title,
  startsAt: event.startsAt.toISOString(),
  endsAt: event.endsAt.toISOString(),
  slotCount: event.slotCount,
  slotMinutes: event.slotMinutes,
});

const eventShape = t.Object({
  id: t.Number(),
  title: t.String(),
  startsAt: t.String(),
  endsAt: t.String(),
  slotCount: t.Number(),
  slotMinutes: t.Number(),
});

const signupShape = t.Object({
  id: t.Number(),
  slot: t.Number(),
  name: t.String(),
  act: t.Union([t.String(), t.Null()]),
  createdAt: t.String(),
});

const slotShape = t.Object({
  slot: t.Number(),
  startsAt: t.String(),
  signup: t.Union([signupShape, t.Null()]),
});

const errorShape = t.Object({ error: t.String() });

const nextEvent = async (now: Date) => {
  if (!db) return null;
  const cutoff = new Date(now.getTime() - SIGNUP_WINDOW_MS);
  const rows = await db
    .select()
    .from(events)
    .where(gte(events.endsAt, cutoff))
    .orderBy(asc(events.startsAt), asc(events.id));
  if (rows.length === 0) return null;
  // Prefer the soonest event that hasn't ended yet (the current or next show);
  // fall back to the most recently ended event still inside its post-show grace.
  const live = rows.find((event) => event.endsAt.getTime() >= now.getTime());
  if (live) return live;
  return rows.reduce((best, event) =>
    event.endsAt.getTime() > best.endsAt.getTime() ? event : best,
  );
};

export const eventsRoute = new Elysia()
  .get(
    "/events/next",
    async ({ status }) => {
      const now = new Date();
      const testEvent = testModeEvent(now);
      if (testEvent) return { mode: "signup" as const, event: toWire(testEvent) };
      if (!db) return status(503, { error: "Database unavailable" });
      const event = await nextEvent(now);
      if (!event) return { mode: "none" as const, event: null };
      const mode = eventMode(event, now);
      return {
        mode: mode === "expired" ? ("none" as const) : mode,
        event: mode === "expired" ? null : toWire(event),
      };
    },
    {
      response: {
        200: t.Object({
          mode: t.Union([t.Literal("signup"), t.Literal("upcoming"), t.Literal("none")]),
          event: t.Union([eventShape, t.Null()]),
        }),
        503: errorShape,
      },
      detail: {
        summary: "Next open mic",
        description:
          "Returns the soonest event whose sign-up window has not fully passed, with mode `signup` (running or within 30 minutes of opening/closing), `upcoming`, or `none`.",
        tags: ["Events"],
      },
    },
  )
  .get(
    "/events/:id/signups",
    async ({ params, status }) => {
      if (!Number.isInteger(params.id)) return status(404, { error: "Event not found" });
      if (params.id === TEST_EVENT_ID) {
        const now = new Date();
        const testEvent = testModeEvent(now);
        if (!testEvent) return status(404, { error: "Event not found" });
        return { slots: toSlots(testEvent, listTestSignups(now)) };
      }
      if (!db) return status(503, { error: "Database unavailable" });
      const [event] = await db.select().from(events).where(eq(events.id, params.id)).limit(1);
      if (!event) return status(404, { error: "Event not found" });
      const rows = await db.select().from(signups).where(eq(signups.eventId, params.id));
      return { slots: toSlots(event, rows) };
    },
    {
      params: t.Object({ id: t.Numeric() }),
      response: {
        200: t.Object({ slots: t.Array(slotShape) }),
        404: errorShape,
        503: errorShape,
      },
      detail: {
        summary: "List an event's sign-up slots",
        description:
          "Returns one entry per slot (the event's configured slot count and length), each with the sign-up occupying it or null.",
        tags: ["Events"],
      },
    },
  )
  .post(
    "/events/:id/signups",
    async ({ params, body, status }) => {
      if (!Number.isInteger(params.id)) return status(404, { error: "Event not found" });
      const name = body.name.trim();
      const act = body.act?.trim() || null;
      if (!name) return status(422, { error: "Name is required" });

      if (params.id === TEST_EVENT_ID) {
        const testEvent = testModeEvent();
        if (!testEvent) return status(404, { error: "Event not found" });
        if (body.slot >= testEvent.slotCount) return status(422, { error: "Slot out of range" });
        const result = addTestSignup(body.slot, name, act);
        if (!result.ok) {
          return result.reason === "inactive"
            ? status(404, { error: "Event not found" })
            : status(409, { error: "That slot is already taken" });
        }
        const { signup } = result;
        return status(201, {
          signup: {
            id: signup.id,
            slot: signup.slot,
            name: signup.name,
            act: signup.act,
            createdAt: signup.createdAt.toISOString(),
          },
        });
      }

      if (!db) return status(503, { error: "Database unavailable" });
      const [event] = await db.select().from(events).where(eq(events.id, params.id)).limit(1);
      if (!event) return status(404, { error: "Event not found" });
      if (body.slot >= event.slotCount) return status(422, { error: "Slot out of range" });
      if (eventMode(event, new Date()) !== "signup") {
        return status(409, { error: "Sign-ups are not open for this event" });
      }
      const [row] = await db
        .insert(signups)
        .values({ eventId: params.id, slot: body.slot, name, act })
        .onConflictDoNothing({ target: [signups.eventId, signups.slot] })
        .returning();
      if (!row) return status(409, { error: "That slot is already taken" });
      return status(201, {
        signup: {
          id: row.id,
          slot: row.slot,
          name: row.name,
          act: row.act,
          createdAt: row.createdAt.toISOString(),
        },
      });
    },
    {
      params: t.Object({ id: t.Numeric() }),
      body: t.Object({
        slot: t.Integer({ minimum: 0 }),
        name: t.String({ minLength: 1, maxLength: 80 }),
        act: t.Optional(t.String({ maxLength: 200 })),
      }),
      response: {
        201: t.Object({ signup: signupShape }),
        404: errorShape,
        409: errorShape,
        422: errorShape,
        503: errorShape,
      },
      detail: {
        summary: "Claim a sign-up slot",
        description:
          "Only allowed while the event's sign-up window is open. Each slot can be claimed once.",
        tags: ["Events"],
      },
    },
  );
