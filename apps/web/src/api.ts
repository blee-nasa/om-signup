export type Health = {
  status: "ok" | "degraded";
  db: { connected: boolean; result: number | null };
  anthropic: { reachable: boolean };
};

export async function fetchHealth(): Promise<Health> {
  const res = await fetch("/api");
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return (await res.json()) as Health;
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

export async function sendChat(messages: ChatMessage[]): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error(`Chat failed: ${res.status}`);
  const body = (await res.json()) as { response: string };
  return body.response;
}
