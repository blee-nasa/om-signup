export type Health = {
  status: "ok" | "degraded";
  db: { connected: boolean; result: number | null };
};

// The API is reachable at `/api` in every environment: Vite proxies it to the
// API server in dev, and the single-app server mounts it there in prod.
export async function fetchHealth(): Promise<Health> {
  const res = await fetch("/api");
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return (await res.json()) as Health;
}
