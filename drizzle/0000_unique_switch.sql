CREATE TABLE `buzz_events` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`team_id` text NOT NULL,
	`round_id` text,
	`reaction_ms` integer NOT NULL,
	`is_first` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `buzz_events_session_id_idx` ON `buzz_events` (`session_id`);--> statement-breakpoint
CREATE INDEX `buzz_events_round_id_idx` ON `buzz_events` (`round_id`);--> statement-breakpoint
CREATE INDEX `buzz_events_team_id_idx` ON `buzz_events` (`team_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `buzz_events_round_team_unq` ON `buzz_events` (`round_id`,`team_id`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `teams_session_id_idx` ON `teams` (`session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `teams_session_name_unq` ON `teams` (`session_id`,`name`);