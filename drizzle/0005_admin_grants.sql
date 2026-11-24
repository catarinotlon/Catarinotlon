CREATE TABLE `admin_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`granted_by` text NOT NULL,
	`granted_at` integer NOT NULL,
	`deleted_at` integer,
	`deleted_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_grants_active_email_unique` ON `admin_grants` (`email`) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE TRIGGER `admin_grants_no_hard_delete` BEFORE DELETE ON `admin_grants`
BEGIN
  SELECT RAISE(ABORT, 'soft delete only: admin_grants rows cannot be physically deleted');
END;
