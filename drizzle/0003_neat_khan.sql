CREATE TABLE "marker_observations" (
	"id" serial PRIMARY KEY NOT NULL,
	"marker_id" text NOT NULL,
	"territory_id" text NOT NULL,
	"value" double precision,
	"raw_value" text,
	"score" double precision,
	"date" date,
	"source" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "marker_observations" ADD CONSTRAINT "marker_observations_marker_id_markers_id_fk" FOREIGN KEY ("marker_id") REFERENCES "public"."markers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marker_observations" ADD CONSTRAINT "marker_observations_territory_id_territories_id_fk" FOREIGN KEY ("territory_id") REFERENCES "public"."territories"("id") ON DELETE no action ON UPDATE no action;