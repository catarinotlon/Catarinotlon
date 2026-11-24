CREATE TRIGGER `account_no_hard_delete` BEFORE DELETE ON `account`
BEGIN
  SELECT RAISE(ABORT, 'soft delete only: account rows cannot be physically deleted');
END;
--> statement-breakpoint
CREATE TRIGGER `user_no_hard_delete` BEFORE DELETE ON `user`
BEGIN
  SELECT RAISE(ABORT, 'soft delete only: user rows cannot be physically deleted');
END;
--> statement-breakpoint
CREATE TRIGGER `account_profiles_no_hard_delete` BEFORE DELETE ON `account_profiles`
BEGIN
  SELECT RAISE(ABORT, 'soft delete only: account_profiles rows cannot be physically deleted');
END;
--> statement-breakpoint
CREATE TRIGGER `legal_acceptances_no_hard_delete` BEFORE DELETE ON `legal_acceptances`
BEGIN
  SELECT RAISE(ABORT, 'soft delete only: legal_acceptances rows cannot be physically deleted');
END;
--> statement-breakpoint
CREATE TRIGGER `registrations_no_hard_delete` BEFORE DELETE ON `registrations`
BEGIN
  SELECT RAISE(ABORT, 'soft delete only: registrations rows cannot be physically deleted');
END;
--> statement-breakpoint
CREATE TRIGGER `registration_changes_no_hard_delete` BEFORE DELETE ON `registration_changes`
BEGIN
  SELECT RAISE(ABORT, 'soft delete only: registration_changes rows cannot be physically deleted');
END;
--> statement-breakpoint
CREATE TRIGGER `tickets_no_hard_delete` BEFORE DELETE ON `tickets`
BEGIN
  SELECT RAISE(ABORT, 'soft delete only: tickets rows cannot be physically deleted');
END;
--> statement-breakpoint
CREATE TRIGGER `payments_no_hard_delete` BEFORE DELETE ON `payments`
BEGIN
  SELECT RAISE(ABORT, 'soft delete only: payments rows cannot be physically deleted');
END;
--> statement-breakpoint
CREATE TRIGGER `payment_registrations_no_hard_delete` BEFORE DELETE ON `payment_registrations`
BEGIN
  SELECT RAISE(ABORT, 'soft delete only: payment_registrations rows cannot be physically deleted');
END;
--> statement-breakpoint
CREATE TRIGGER `receipts_no_hard_delete` BEFORE DELETE ON `receipts`
BEGIN
  SELECT RAISE(ABORT, 'soft delete only: receipts rows cannot be physically deleted');
END;
--> statement-breakpoint
CREATE TRIGGER `kit_pickups_no_hard_delete` BEFORE DELETE ON `kit_pickups`
BEGIN
  SELECT RAISE(ABORT, 'soft delete only: kit_pickups rows cannot be physically deleted');
END;
--> statement-breakpoint
CREATE TRIGGER `event_settings_versions_no_hard_delete` BEFORE DELETE ON `event_settings_versions`
BEGIN
  SELECT RAISE(ABORT, 'soft delete only: event_settings_versions rows cannot be physically deleted');
END;
--> statement-breakpoint
CREATE TRIGGER `erasure_records_no_hard_delete` BEFORE DELETE ON `erasure_records`
BEGIN
  SELECT RAISE(ABORT, 'soft delete only: erasure_records rows cannot be physically deleted');
END;
