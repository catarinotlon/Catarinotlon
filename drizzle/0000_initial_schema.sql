CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`deleted_by` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	`deleted_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `account_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`phone` text,
	`locale` text NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`deleted_by` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `erasure_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`performed_by` text NOT NULL,
	`performed_at` integer NOT NULL,
	`deleted_at` integer,
	`deleted_by` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `event_settings_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`values` text NOT NULL,
	`changed_fields` text NOT NULL,
	`changed_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	`deleted_by` text
);
--> statement-breakpoint
CREATE INDEX `event_settings_versions_created_at_idx` ON `event_settings_versions` (`created_at`);--> statement-breakpoint
CREATE TABLE `kit_pickups` (
	`id` text PRIMARY KEY NOT NULL,
	`registration_id` text NOT NULL,
	`delivered_by` text NOT NULL,
	`delivered_at` integer NOT NULL,
	`collected_by` text,
	`undone_by` text,
	`undone_at` integer,
	`deleted_at` integer,
	`deleted_by` text,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `kit_pickups_registration_id_idx` ON `kit_pickups` (`registration_id`);--> statement-breakpoint
CREATE TABLE `legal_acceptances` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`privacy_version` text NOT NULL,
	`terms_version` text NOT NULL,
	`accepted_at` integer NOT NULL,
	`deleted_at` integer,
	`deleted_by` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `legal_acceptances_user_id_idx` ON `legal_acceptances` (`user_id`);--> statement-breakpoint
CREATE TABLE `payment_registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_id` text NOT NULL,
	`registration_id` text NOT NULL,
	`deleted_at` integer,
	`deleted_by` text,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payment_registrations_payment_id_idx` ON `payment_registrations` (`payment_id`);--> statement-breakpoint
CREATE INDEX `payment_registrations_registration_id_idx` ON `payment_registrations` (`registration_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`concept` text NOT NULL,
	`status` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`rejection_reason` text,
	`reviewed_by` text,
	`reviewed_at` integer,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	`deleted_by` text,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payments_owner_id_idx` ON `payments` (`owner_id`);--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_id` text NOT NULL,
	`pathname` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`uploaded_at` integer NOT NULL,
	`deleted_at` integer,
	`deleted_by` text,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `receipts_payment_id_idx` ON `receipts` (`payment_id`);--> statement-breakpoint
CREATE TABLE `registration_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`registration_id` text NOT NULL,
	`changed_by` text NOT NULL,
	`field` text NOT NULL,
	`previous_value` text,
	`new_value` text,
	`changed_at` integer NOT NULL,
	`deleted_at` integer,
	`deleted_by` text,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `registration_changes_registration_id_idx` ON `registration_changes` (`registration_id`);--> statement-breakpoint
CREATE TABLE `registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text,
	`runner_name` text NOT NULL,
	`distance` text NOT NULL,
	`shirt_size` text NOT NULL,
	`shirt_name` text NOT NULL,
	`bib_number` text NOT NULL,
	`status` text NOT NULL,
	`fee_cents` integer NOT NULL,
	`locale` text NOT NULL,
	`contact_email` text,
	`contact_phone` text,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	`deleted_by` text,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_bib_number_unique` ON `registrations` (`bib_number`);--> statement-breakpoint
CREATE INDEX `registrations_owner_id_idx` ON `registrations` (`owner_id`);--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`registration_id` text NOT NULL,
	`issued_at` integer NOT NULL,
	`deleted_at` integer,
	`deleted_by` text,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_active_registration_unique` ON `tickets` (`registration_id`) WHERE deleted_at IS NULL;