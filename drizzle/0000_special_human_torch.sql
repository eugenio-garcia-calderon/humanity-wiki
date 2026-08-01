CREATE TABLE "actors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"description" text,
	"severity" integer,
	"status" text
);
--> statement-breakpoint
CREATE TABLE "indicators" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"unit" text,
	"value" real,
	"target" real,
	"date" timestamp,
	"territory_id" text,
	"objective_id" text,
	"source" text,
	"source_url" text
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"territory_id" text,
	"location" geometry(point),
	"status" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"budget" real
);
--> statement-breakpoint
CREATE TABLE "solutions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text,
	"branch" text,
	"description" text,
	"maturity" text,
	"scalability" text
);
--> statement-breakpoint
CREATE TABLE "territories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"type" text NOT NULL,
	"parent_id" text,
	"population" integer,
	"area_km2" real,
	"location" geometry(point),
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
ALTER TABLE "indicators" ADD CONSTRAINT "indicators_territory_id_territories_id_fk" FOREIGN KEY ("territory_id") REFERENCES "public"."territories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_territory_id_territories_id_fk" FOREIGN KEY ("territory_id") REFERENCES "public"."territories"("id") ON DELETE no action ON UPDATE no action;