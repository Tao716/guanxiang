CREATE TABLE `ai_generations` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_id` text,
	`feature` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`status` text NOT NULL,
	`latency_ms` integer NOT NULL,
	`input_chars` integer DEFAULT 0 NOT NULL,
	`output_chars` integer DEFAULT 0 NOT NULL,
	`error_code` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`visitor_id`) REFERENCES `visitors`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_ai_generations_created` ON `ai_generations` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_ai_generations_feature_model` ON `ai_generations` (`feature`,`model`);--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_id` text,
	`reading_id` text,
	`helpful` integer NOT NULL,
	`reason` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`visitor_id`) REFERENCES `visitors`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`reading_id`) REFERENCES `readings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_feedback_reading` ON `feedback` (`reading_id`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`visitor_id` text PRIMARY KEY NOT NULL,
	`nickname` text DEFAULT '' NOT NULL,
	`life_stage` text NOT NULL,
	`focus` text NOT NULL,
	`response_style` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`visitor_id`) REFERENCES `visitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `readings` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_id` text NOT NULL,
	`client_id` integer NOT NULL,
	`question` text NOT NULL,
	`category` text NOT NULL,
	`lines_json` text NOT NULL,
	`reading_json` text,
	`ai_reading_json` text,
	`commitment_json` text,
	`follow_ups_json` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`visitor_id`) REFERENCES `visitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_readings_visitor_created` ON `readings` (`visitor_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `usage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_id` text,
	`event_name` text NOT NULL,
	`route` text NOT NULL,
	`metadata_json` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`visitor_id`) REFERENCES `visitors`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_usage_events_name_created` ON `usage_events` (`event_name`,`created_at`);--> statement-breakpoint
CREATE TABLE `visitors` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
PRAGMA optimize;
