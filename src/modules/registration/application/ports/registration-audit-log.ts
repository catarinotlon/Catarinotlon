/** One recorded change to a registration field. */
export interface RegistrationChange {
  /** Entry UUID. */
  readonly id: string;
  /** The registration that changed. */
  readonly registrationId: string;
  /** The user who made the change. */
  readonly changedBy: string;
  /** The field that changed. */
  readonly field: string;
  /** The value before the change. */
  readonly previousValue: string | null;
  /** The value after the change. */
  readonly newValue: string | null;
  /** When the change was made. */
  readonly changedAt: Date;
}

/**
 * Append-only record of changes to registrations.
 *
 * @example
 * ```ts
 * await audit.record(change);
 * ```
 */
export interface RegistrationAuditLog {
  /**
   * Records one change.
   *
   * @param change - The change.
   */
  record(change: RegistrationChange): Promise<void>;

  /**
   * Lists the changes to a registration, oldest first.
   *
   * @param registrationId - The registration's UUID.
   * @returns The changes.
   */
  listFor(registrationId: string): Promise<RegistrationChange[]>;
}
