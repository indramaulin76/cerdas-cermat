ALTER TABLE `buzz_events` ADD `answer_status` text;--> statement-breakpoint
ALTER TABLE `rounds` ADD `answering_team_id` text REFERENCES teams(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `rounds` ADD `answer_started_at` integer;--> statement-breakpoint
ALTER TABLE `rounds` ADD `awaiting_next` integer DEFAULT false NOT NULL;