CREATE TABLE `meals` (
	`id` text PRIMARY KEY NOT NULL,
	`caption` text,
	`photo_path` text,
	`items` text DEFAULT '[]' NOT NULL,
	`total_calories` integer,
	`total_protein` integer,
	`usage_cost` text,
	`confidence` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `meals_created_idx` ON `meals` (`created_at`);
