CREATE TABLE `agent_invocations` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`status` text NOT NULL,
	`record` text NOT NULL,
	`claim_id` text,
	`claim_expires_at` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_invocations_id_unique` ON `agent_invocations` (`id`);--> statement-breakpoint
CREATE INDEX `agent_invocations_status_idx` ON `agent_invocations` (`status`);--> statement-breakpoint
CREATE INDEX `agent_invocations_updated_idx` ON `agent_invocations` (`updated_at`);