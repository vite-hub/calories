ALTER TABLE `meals` ADD `photo_file_id` text;--> statement-breakpoint
CREATE INDEX `meals_photo_file_idx` ON `meals` (`photo_file_id`);