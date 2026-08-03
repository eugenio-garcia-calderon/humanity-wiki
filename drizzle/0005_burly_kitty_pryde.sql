CREATE TABLE "challenge_indicators" (
	"challenge_id" text NOT NULL,
	"indicator_id" text NOT NULL,
	CONSTRAINT "challenge_indicators_challenge_id_indicator_id_pk" PRIMARY KEY("challenge_id","indicator_id")
);
--> statement-breakpoint
CREATE TABLE "challenge_markers" (
	"challenge_id" text NOT NULL,
	"marker_id" text NOT NULL,
	CONSTRAINT "challenge_markers_challenge_id_marker_id_pk" PRIMARY KEY("challenge_id","marker_id")
);
--> statement-breakpoint
CREATE TABLE "challenge_metrics" (
	"challenge_id" text NOT NULL,
	"metric_id" text NOT NULL,
	CONSTRAINT "challenge_metrics_challenge_id_metric_id_pk" PRIMARY KEY("challenge_id","metric_id")
);
--> statement-breakpoint
ALTER TABLE "challenge_indicators" ADD CONSTRAINT "challenge_indicators_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_indicators" ADD CONSTRAINT "challenge_indicators_indicator_id_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_markers" ADD CONSTRAINT "challenge_markers_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_markers" ADD CONSTRAINT "challenge_markers_marker_id_markers_id_fk" FOREIGN KEY ("marker_id") REFERENCES "public"."markers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_metrics" ADD CONSTRAINT "challenge_metrics_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_metrics" ADD CONSTRAINT "challenge_metrics_metric_id_metrics_id_fk" FOREIGN KEY ("metric_id") REFERENCES "public"."metrics"("id") ON DELETE no action ON UPDATE no action;