CREATE TABLE "causes" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"type" text,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "challenge_causes" (
	"challenge_id" text NOT NULL,
	"cause_id" text NOT NULL,
	CONSTRAINT "challenge_causes_challenge_id_cause_id_pk" PRIMARY KEY("challenge_id","cause_id")
);
--> statement-breakpoint
CREATE TABLE "challenge_objectives" (
	"challenge_id" text NOT NULL,
	"objective_id" text NOT NULL,
	CONSTRAINT "challenge_objectives_challenge_id_objective_id_pk" PRIMARY KEY("challenge_id","objective_id")
);
--> statement-breakpoint
CREATE TABLE "challenge_solutions" (
	"challenge_id" text NOT NULL,
	"solution_id" text NOT NULL,
	CONSTRAINT "challenge_solutions_challenge_id_solution_id_pk" PRIMARY KEY("challenge_id","solution_id")
);
--> statement-breakpoint
CREATE TABLE "challenge_territories" (
	"challenge_id" text NOT NULL,
	"territory_id" text NOT NULL,
	CONSTRAINT "challenge_territories_challenge_id_territory_id_pk" PRIMARY KEY("challenge_id","territory_id")
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"scope" text NOT NULL,
	"description" text,
	"priority" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"type" text,
	"summary" text,
	"url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "indicator_observations" (
	"id" serial PRIMARY KEY NOT NULL,
	"indicator_id" text NOT NULL,
	"territory_id" text NOT NULL,
	"value" double precision NOT NULL,
	"date" date,
	"source" text,
	"source_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "indicators" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"unit" text,
	"category" text,
	"direction" text,
	"objective_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"stripe_customer_id" text,
	"stripe_checkout_session_id" text,
	"stripe_subscription_id" text,
	"status" text DEFAULT 'inactive' NOT NULL,
	"membership_type" text DEFAULT 'socio_regular' NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "objectives" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organization_objectives" (
	"organization_id" text NOT NULL,
	"objective_id" text NOT NULL,
	CONSTRAINT "organization_objectives_organization_id_objective_id_pk" PRIMARY KEY("organization_id","objective_id")
);
--> statement-breakpoint
CREATE TABLE "organization_solutions" (
	"organization_id" text NOT NULL,
	"solution_id" text NOT NULL,
	CONSTRAINT "organization_solutions_organization_id_solution_id_pk" PRIMARY KEY("organization_id","solution_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text,
	"scale" text,
	"territory_id" text,
	"description" text,
	"image" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_challenges" (
	"project_id" text NOT NULL,
	"challenge_id" text NOT NULL,
	CONSTRAINT "project_challenges_project_id_challenge_id_pk" PRIMARY KEY("project_id","challenge_id")
);
--> statement-breakpoint
CREATE TABLE "project_objectives" (
	"project_id" text NOT NULL,
	"objective_id" text NOT NULL,
	CONSTRAINT "project_objectives_project_id_objective_id_pk" PRIMARY KEY("project_id","objective_id")
);
--> statement-breakpoint
CREATE TABLE "project_organizations" (
	"project_id" text NOT NULL,
	"organization_id" text NOT NULL,
	CONSTRAINT "project_organizations_project_id_organization_id_pk" PRIMARY KEY("project_id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "project_solutions" (
	"project_id" text NOT NULL,
	"solution_id" text NOT NULL,
	CONSTRAINT "project_solutions_project_id_solution_id_pk" PRIMARY KEY("project_id","solution_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text,
	"territory_id" text,
	"status" text,
	"description" text,
	"image" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "solution_causes" (
	"solution_id" text NOT NULL,
	"cause_id" text NOT NULL,
	CONSTRAINT "solution_causes_solution_id_cause_id_pk" PRIMARY KEY("solution_id","cause_id")
);
--> statement-breakpoint
CREATE TABLE "solutions" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"type" text,
	"description" text,
	"impact" text,
	"cost" text,
	"readiness" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"stripe_event_id" text NOT NULL,
	"type" text NOT NULL,
	"processed_at" timestamp DEFAULT now(),
	CONSTRAINT "stripe_events_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint
CREATE TABLE "territories" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"parent_id" text,
	"description" text,
	"population" integer,
	"area_km2" double precision,
	"geometry" geometry(point),
	"centroid" geometry(point),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" text DEFAULT 'user',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "challenge_causes" ADD CONSTRAINT "challenge_causes_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_causes" ADD CONSTRAINT "challenge_causes_cause_id_causes_id_fk" FOREIGN KEY ("cause_id") REFERENCES "public"."causes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_objectives" ADD CONSTRAINT "challenge_objectives_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_objectives" ADD CONSTRAINT "challenge_objectives_objective_id_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_solutions" ADD CONSTRAINT "challenge_solutions_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_solutions" ADD CONSTRAINT "challenge_solutions_solution_id_solutions_id_fk" FOREIGN KEY ("solution_id") REFERENCES "public"."solutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_territories" ADD CONSTRAINT "challenge_territories_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_territories" ADD CONSTRAINT "challenge_territories_territory_id_territories_id_fk" FOREIGN KEY ("territory_id") REFERENCES "public"."territories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_observations" ADD CONSTRAINT "indicator_observations_indicator_id_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_observations" ADD CONSTRAINT "indicator_observations_territory_id_territories_id_fk" FOREIGN KEY ("territory_id") REFERENCES "public"."territories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicators" ADD CONSTRAINT "indicators_objective_id_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_objectives" ADD CONSTRAINT "organization_objectives_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_objectives" ADD CONSTRAINT "organization_objectives_objective_id_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_solutions" ADD CONSTRAINT "organization_solutions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_solutions" ADD CONSTRAINT "organization_solutions_solution_id_solutions_id_fk" FOREIGN KEY ("solution_id") REFERENCES "public"."solutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_territory_id_territories_id_fk" FOREIGN KEY ("territory_id") REFERENCES "public"."territories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_challenges" ADD CONSTRAINT "project_challenges_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_challenges" ADD CONSTRAINT "project_challenges_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_objectives" ADD CONSTRAINT "project_objectives_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_objectives" ADD CONSTRAINT "project_objectives_objective_id_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_organizations" ADD CONSTRAINT "project_organizations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_organizations" ADD CONSTRAINT "project_organizations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_solutions" ADD CONSTRAINT "project_solutions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_solutions" ADD CONSTRAINT "project_solutions_solution_id_solutions_id_fk" FOREIGN KEY ("solution_id") REFERENCES "public"."solutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_territory_id_territories_id_fk" FOREIGN KEY ("territory_id") REFERENCES "public"."territories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_causes" ADD CONSTRAINT "solution_causes_solution_id_solutions_id_fk" FOREIGN KEY ("solution_id") REFERENCES "public"."solutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_causes" ADD CONSTRAINT "solution_causes_cause_id_causes_id_fk" FOREIGN KEY ("cause_id") REFERENCES "public"."causes"("id") ON DELETE no action ON UPDATE no action;