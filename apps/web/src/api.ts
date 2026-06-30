export type Health = {
  status: "ok" | "degraded";
  db: { connected: boolean; result: number | null };
};

export async function fetchHealth(): Promise<Health> {
  const res = await fetch("/api");
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return (await res.json()) as Health;
}
