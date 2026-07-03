CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text DEFAULT 'Open Mic Night' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signups" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"name" text NOT NULL,
	"act" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "signups" ADD CONSTRAINT "signups_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;