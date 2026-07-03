import { integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default("Open Mic Night"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  slotCount: integer("slot_count").notNull().default(9),
  slotMinutes: integer("slot_minutes").notNull().default(20),
});

export const signups = pgTable(
  "signups",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    slot: integer("slot").notNull(),
    name: text("name").notNull(),
    act: text("act"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("signups_event_slot_unique").on(table.eventId, table.slot)],
);
