CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`content` text,
	`url` text NOT NULL,
	`image_url` text,
	`source_name` text NOT NULL,
	`author` text,
	`published_at` text NOT NULL,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_url_unique` ON `articles` (`url`);--> statement-breakpoint
CREATE INDEX `idx_articles_published_at` ON `articles` (`published_at`);