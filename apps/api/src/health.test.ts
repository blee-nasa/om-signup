import { describe, expect, it, vi } from "vitest";

vi.mock("./anthropic-probe.ts", () => ({
  checkAnthropic: vi.fn().mockResolvedValue({ reachable: true }),
}));

import { createApi } from "./app.ts";

const app = createApi();
const get = (path: string) => app.handle(new Request(`http://localhost${path}`));

type HealthBody = {
  status: string;
  db: { connected: boolean; result: number | null };
  anthropic: { reachable: boolean };
};

describe("GET / (healthcheck)", () => {
  it("responds 200 with a status + db + anthropic shape", async () => {
    const res = await get("/");
    expect(res.status).toBe(200);
    const body = (await res.json()) as HealthBody;
    expect(body).toHaveProperty("status");
    expect(typeof body.db.connected).toBe("boolean");
    expect(typeof body.anthropic.reachable).toBe("boolean");
  });

  it.skipIf(!process.env.DATABASE_URL)(
    "reports ok when the DB and Anthropic are both reachable",
    async () => {
      const res = await get("/");
      const body = (await res.json()) as HealthBody;
      expect(body.db.connected).toBe(true);
      expect(body.db.result).toBe(2);
      expect(body.anthropic.reachable).toBe(true);
      expect(body.status).toBe("ok");
    },
  );
});
