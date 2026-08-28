ALTER TABLE `profiles` ADD `topic` text DEFAULT '事业' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `birth_context_json` text;--> statement-breakpoint
ALTER TABLE `readings` ADD `topic` text DEFAULT '选择' NOT NULL;