ALTER TABLE "signups" ADD COLUMN "slot" integer NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "signups_event_slot_unique" ON "signups" USING btree ("event_id","slot");