/** One erasure to carry out. */
export interface ErasureRequest {
  /** UUID of the erasure record. */
  readonly recordId: string;
  /** The account whose personal data is erased. */
  readonly userId: string;
  /** The admin carrying it out. */
  readonly performedBy: string;
  /** When it runs. */
  readonly at: Date;
}

/**
 * Anonymizes a person's data in place.
 *
 * @remarks
 * Rows, IDs, bib numbers, and payment records stay. This is irreversible and is
 * not a soft delete. Stored receipt files are kept pending legal review.
 *
 * @example
 * ```ts
 * await eraser.erase({ recordId, userId, performedBy, at });
 * ```
 */
export interface PersonalDataEraser {
  /**
   * Overwrites the account's personal fields and records the erasure.
   *
   * @param request - The erasure to carry out.
   */
  erase(request: ErasureRequest): Promise<void>;
}

/** A request to erase a registration that has no account. */
export interface RegistrationErasureRequest {
  /** UUID of the erasure record. */
  readonly recordId: string;
  /** The registration whose personal data is erased. */
  readonly registrationId: string;
  /** The admin carrying it out. */
  readonly performedBy: string;
  /** When it runs. */
  readonly at: Date;
}

/**
 * Anonymizes a manual registration, which has no account to erase through.
 *
 * @example
 * ```ts
 * const erased = await eraser.eraseManual({ recordId, registrationId, performedBy, at });
 * ```
 */
export interface ManualRegistrationEraser {
  /**
   * Overwrites the registration's personal fields and records the erasure.
   *
   * @param request - The erasure to carry out.
   * @returns `false`, changing nothing, when it is unknown or belongs to an account.
   */
  eraseManual(request: RegistrationErasureRequest): Promise<boolean>;
}
