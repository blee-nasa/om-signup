import { describe, expect, it } from "vitest";
import { createApi } from "../app.ts";

const app = createApi();
const req = (path: string, init?: RequestInit) =>
  app.handle(new Request(`http://localhost${path}`, init));

const postJson = (path: string, body: unknown) =>
  req(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

// Integration: exercises a real round-trip through Drizzle -> Postgres.
describe.skipIf(!process.env.DATABASE_URL)("signups (integration)", () => {
  it("creates a sign-up and lists it back", async () => {
    const name = `Tester ${crypto.randomUUID()}`;
    const created = await postJson("/signups", { name, act: "Spoken word" });
    expect(created.status).toBe(201);
    const row = (await created.json()) as { id: number; name: string; act: string };
    expect(row.name).toBe(name);
    expect(row.id).toBeGreaterThan(0);

    const list = await req("/signups");
    expect(list.status).toBe(200);
    const rows = (await list.json()) as Array<{ id: number }>;
    expect(rows.some((r) => r.id === row.id)).toBe(true);
  });

  it("rejects an empty name with 422", async () => {
    const res = await postJson("/signups", { name: "", act: "Music" });
    expect(res.status).toBe(422);
  });
});
