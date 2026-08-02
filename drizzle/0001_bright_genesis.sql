ALTER TABLE "indicator_observations" ADD COLUMN "raw_value" text;--> statement-breakpoint
ALTER TABLE "indicator_observations" ADD COLUMN "score" double precision;--> statement-breakpoint
ALTER TABLE "indicator_observations" ADD COLUMN "weighted_score" double precision;--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "weight" double precision;--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "methodology" text;