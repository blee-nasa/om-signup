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

export type OpenMicEvent = {
  id: number;
  title: string;
  startsAt: string;
  endsAt: string;
  slotCount: number;
  slotMinutes: number;
};

export type NextEvent = {
  mode: "signup" | "upcoming" | "none";
  event: OpenMicEvent | null;
};

export async function fetchNextEvent(): Promise<NextEvent> {
  const res = await fetch("/api/events/next");
  if (!res.ok) throw new Error(`Next event failed: ${res.status}`);
  return (await res.json()) as NextEvent;
}

export type Signup = { id: number; slot: number; name: string; act: string | null; createdAt: string };

export type SlotEntry = {
  slot: number;
  startsAt: string;
  signup: Signup | null;
  claiming: boolean;
};

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const serverError = async (res: Response, fallback: string): Promise<string> => {
  try {
    const body = (await res.json()) as { error?: string };
    if (body?.error) return body.error;
  } catch {
    // non-JSON body
  }
  return fallback;
};

export async function fetchSlots(eventId: number): Promise<SlotEntry[]> {
  const res = await fetch(`/api/events/${eventId}/signups`);
  if (!res.ok) throw new ApiError(await serverError(res, `Slots failed: ${res.status}`), res.status);
  const body = (await res.json()) as { slots: SlotEntry[] };
  return body.slots;
}

export async function claimSlot(eventId: number, slot: number): Promise<void> {
  const res = await fetch(`/api/events/${eventId}/signups/${slot}/claim`, { method: "POST" });
  if (!res.ok) throw new ApiError(await serverError(res, `Claim failed: ${res.status}`), res.status);
}

export async function releaseSlot(eventId: number, slot: number): Promise<void> {
  await fetch(`/api/events/${eventId}/signups/${slot}/release`, { method: "POST" }).catch(() => {});
}

export async function createSignup(
  eventId: number,
  input: { slot: number; name: string; act?: string },
): Promise<Signup> {
  const res = await fetch(`/api/events/${eventId}/signups`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ApiError(await serverError(res, `Sign-up failed: ${res.status}`), res.status);
  const body = (await res.json()) as { signup: Signup };
  return body.signup;
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
