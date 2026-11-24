CREATE TRIGGER `registration_erasure_records_no_hard_delete` BEFORE DELETE ON `registration_erasure_records`
BEGIN
  SELECT RAISE(ABORT, 'soft delete only: registration_erasure_records rows cannot be physically deleted');
END;
