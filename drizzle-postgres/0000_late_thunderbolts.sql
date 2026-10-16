CREATE TABLE "buzz_events" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"team_id" text NOT NULL,
	"round_id" text,
	"reaction_ms" integer NOT NULL,
	"is_first" boolean DEFAULT false NOT NULL,
	"answer_status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"order_number" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"started_at" timestamp with time zone,
	"answering_team_id" text,
	"answer_started_at" timestamp with time zone,
	"awaiting_next" boolean DEFAULT false NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text DEFAULT 'Cerdas Cermat Live' NOT NULL,
	"moderator_pin" text,
	"viewer_pin" text,
	"team_pin" text,
	"cooldown_seconds" integer DEFAULT 10 NOT NULL,
	"correct_points" integer DEFAULT 100 NOT NULL,
	"wrong_points" integer DEFAULT -50 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'panitia' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "buzz_events" ADD CONSTRAINT "buzz_events_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buzz_events" ADD CONSTRAINT "buzz_events_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_answering_team_id_teams_id_fk" FOREIGN KEY ("answering_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "buzz_events_session_id_idx" ON "buzz_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "buzz_events_round_id_idx" ON "buzz_events" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "buzz_events_team_id_idx" ON "buzz_events" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "buzz_events_round_team_unq" ON "buzz_events" USING btree ("round_id","team_id");--> statement-breakpoint
CREATE INDEX "rounds_session_id_idx" ON "rounds" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "sessions_created_at_idx" ON "sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sessions_status_idx" ON "sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "teams_session_id_idx" ON "teams" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_session_name_unq" ON "teams" USING btree ("session_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");