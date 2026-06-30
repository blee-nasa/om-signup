import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Starter schema for the Open Mic sign-up sheet. The healthcheck itself only
// needs `SELECT 1 + 1`, but a real table makes the Drizzle wiring and the
// integration tests meaningful.
export const signups = pgTable("signups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  act: text("act").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Signup = typeof signups.$inferSelect;
