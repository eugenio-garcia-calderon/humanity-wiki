CREATE TABLE "markers" (
	"id" text PRIMARY KEY NOT NULL,
	"indicator_id" text NOT NULL,
	"name" text NOT NULL,
	"includes" text,
	"description" text,
	"unit" text,
	"weight" double precision,
	"source" text,
	"last_updated" date,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "markers" ADD CONSTRAINT "markers_indicator_id_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE no action ON UPDATE no action;