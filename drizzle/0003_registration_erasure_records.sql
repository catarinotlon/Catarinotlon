CREATE TABLE `registration_erasure_records` (
	`id` text PRIMARY KEY NOT NULL,
	`registration_id` text NOT NULL,
	`performed_by` text NOT NULL,
	`performed_at` integer NOT NULL,
	`deleted_at` integer,
	`deleted_by` text,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE no action
);
