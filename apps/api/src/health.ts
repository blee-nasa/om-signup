import { sql } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { checkAnthropic } from "./anthropic-probe.ts";
import { db } from "./db/index.ts";

const healthResponse = t.Object({
  status: t.Union([t.Literal("ok"), t.Literal("degraded")]),
  db: t.Object({
    connected: t.Boolean(),
    result: t.Union([t.Number(), t.Null()]),
  }),
  anthropic: t.Object({
    reachable: t.Boolean(),
  }),
});

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

export const healthRoute = new Elysia().get(
  "/",
  async () => {
    const [dbStatus, anthropicStatus] = await Promise.all([checkDb(), checkAnthropic()]);
    const healthy = dbStatus.connected && anthropicStatus.reachable;
    return {
      status: healthy ? ("ok" as const) : ("degraded" as const),
      db: dbStatus,
      anthropic: anthropicStatus,
    };
  },
  {
    response: { 200: healthResponse },
    detail: {
      summary: "Healthcheck",
      description:
        "Verifies the DB connection (`SELECT 1 + 1`) and probes the Anthropic API with a minimal Haiku request (cached 60s).",
      tags: ["System"],
    },
  },
);
