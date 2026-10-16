CREATE TABLE `rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`order_number` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`started_at` integer,
	`ended_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `rounds_session_id_idx` ON `rounds` (`session_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text DEFAULT 'Cerdas Cermat Live' NOT NULL,
	`cooldown_seconds` integer DEFAULT 10 NOT NULL,
	`correct_points` integer DEFAULT 100 NOT NULL,
	`wrong_points` integer DEFAULT -50 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_buzz_events` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`team_id` text NOT NULL,
	`round_id` text,
	`reaction_ms` integer NOT NULL,
	`is_first` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`round_id`) REFERENCES `rounds`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_buzz_events`("id", "session_id", "team_id", "round_id", "reaction_ms", "is_first", "created_at") SELECT "id", "session_id", "team_id", "round_id", "reaction_ms", "is_first", "created_at" FROM `buzz_events`;--> statement-breakpoint
DROP TABLE `buzz_events`;--> statement-breakpoint
ALTER TABLE `__new_buzz_events` RENAME TO `buzz_events`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `buzz_events_session_id_idx` ON `buzz_events` (`session_id`);--> statement-breakpoint
CREATE INDEX `buzz_events_round_id_idx` ON `buzz_events` (`round_id`);--> statement-breakpoint
CREATE INDEX `buzz_events_team_id_idx` ON `buzz_events` (`team_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `buzz_events_round_team_unq` ON `buzz_events` (`round_id`,`team_id`);--> statement-breakpoint
CREATE TABLE `__new_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_teams`("id", "session_id", "name", "color", "score", "created_at") SELECT "id", "session_id", "name", "color", "score", "created_at" FROM `teams`;--> statement-breakpoint
DROP TABLE `teams`;--> statement-breakpoint
ALTER TABLE `__new_teams` RENAME TO `teams`;--> statement-breakpoint
CREATE INDEX `teams_session_id_idx` ON `teams` (`session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `teams_session_name_unq` ON `teams` (`session_id`,`name`);