import { describe, expect, it } from "vitest";
import { createApi } from "./app.ts";

const app = createApi();
const get = (path: string) => app.handle(new Request(`http://localhost${path}`));

describe("GET / (healthcheck)", () => {
  it("responds 200 with a status + db shape", async () => {
    const res = await get("/");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      db: { connected: boolean; result: number | null };
    };
    expect(body).toHaveProperty("status");
    expect(typeof body.db.connected).toBe("boolean");
  });

  // Integration: requires a reachable Postgres (DATABASE_URL set via .env).
  it.skipIf(!process.env.DATABASE_URL)(
    "reports the DB connected via SELECT 1 + 1",
    async () => {
      const res = await get("/");
      const body = (await res.json()) as {
        status: string;
        db: { connected: boolean; result: number | null };
      };
      expect(body.db.connected).toBe(true);
      expect(body.db.result).toBe(2);
      expect(body.status).toBe("ok");
    },
  );
});
