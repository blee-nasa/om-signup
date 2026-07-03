ALTER TABLE "events" ADD COLUMN "slot_count" integer DEFAULT 9 NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "slot_minutes" integer DEFAULT 20 NOT NULL;