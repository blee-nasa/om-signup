import { desc } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../db/index.ts";
import { signups } from "../db/schema.ts";

export const signupRoutes = new Elysia({ prefix: "/signups" })
  .get(
    "/",
    async () => {
      if (!db) return [];
      return db.select().from(signups).orderBy(desc(signups.createdAt));
    },
    {
      detail: { summary: "List sign-ups", tags: ["Signups"] },
    },
  )
  .post(
    "/",
    async ({ body, status }) => {
      if (!db) return status(503, { error: "Database not configured" });
      const [row] = await db
        .insert(signups)
        .values({ name: body.name, act: body.act })
        .returning();
      return status(201, row);
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        act: t.String({ minLength: 1 }),
      }),
      detail: { summary: "Add a sign-up", tags: ["Signups"] },
    },
  );
