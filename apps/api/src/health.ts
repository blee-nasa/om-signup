import { sql } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "./db/index.ts";

const healthResponse = t.Object({
  status: t.Union([t.Literal("ok"), t.Literal("degraded")]),
  db: t.Object({
    connected: t.Boolean(),
    result: t.Union([t.Number(), t.Null()]),
  }),
});

// Proves the API <-> DB path end to end with a `SELECT 1 + 1` round-trip.
export const checkDb = async (): Promise<{ connected: boolean; result: number | null }> => {
  if (!db) return { connected: false, result: null };
  try {
    const rows = (await db.execute(sql`select 1 + 1 as result`)) as unknown as Array<{
      result: number | string;
    }>;
    const result = Number(rows[0]?.result);
    if (Number.isNaN(result)) return { connected: false, result: null };
    return { connected: result === 2, result };
  } catch {
    return { connected: false, result: null };
  }
};

// `GET /` returns the healthcheck JSON. Mounted at the API root, so it answers
// at `/` when the API runs standalone and at `/api` when the single-app server
// mounts the API under that prefix.
export const healthRoute = new Elysia().get(
  "/",
  async () => {
    const dbStatus = await checkDb();
    // Intentionally always HTTP 200 (a liveness signal, not readiness): this
    // endpoint doubles as the SPA's status source, which must get a 200 to show
    // "DB: Disconnected", and one process serves both the SPA and the API — a
    // 503 on DB loss would pull the whole site from Fly rotation. DB health is
    // reported in the body (`db.connected` / `status: "degraded"`).
    return {
      status: dbStatus.connected ? ("ok" as const) : ("degraded" as const),
      db: dbStatus,
    };
  },
  {
    response: { 200: healthResponse },
    detail: {
      summary: "Healthcheck",
      description: "Runs `SELECT 1 + 1` against Postgres to verify the DB connection.",
      tags: ["System"],
    },
  },
);
