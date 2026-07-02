import { Claude, ClaudeModels } from "./lib/Claude/index.ts";

const TTL_MS = 60_000;
const PROBE_TIMEOUT_MS = 15_000;

let cache: { at: number; reachable: boolean } | null = null;

const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timer)), timeout]);
};

const probe = async (): Promise<boolean> => {
  try {
    await new Claude().sendMessage([{ role: "user", content: "ping" }], {
      model: ClaudeModels.Haiku,
    });
    return true;
  } catch {
    return false;
  }
};

export const checkAnthropic = async (now = Date.now()): Promise<{ reachable: boolean }> => {
  // Without an API key the facade falls back to the local Claude CLI, which only
  // exists in development. In production that probe hangs (no CLI in the
  // container) and would stall the healthcheck, so report unreachable instantly.
  if (!process.env.ANTHROPIC_API_KEY && process.env.NODE_ENV === "production") {
    return { reachable: false };
  }
  if (cache && now - cache.at < TTL_MS) return { reachable: cache.reachable };
  const reachable = await withTimeout(probe(), PROBE_TIMEOUT_MS, false);
  cache = { at: now, reachable };
  return { reachable };
};

