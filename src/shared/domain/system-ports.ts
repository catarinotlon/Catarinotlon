/** Provides the current time, so the domain never reads the system clock. */
export interface Clock {
  /**
   * Returns the current time.
   *
   * @returns The current instant.
   */
  now(): Date;
}

/** Generates entity identifiers. */
export interface IdGenerator {
  /**
   * Generates a new UUID.
   *
   * @returns A UUID string.
   */
  uuid(): string;
}

/** Provides random numbers, so the domain never calls a random source itself. */
export interface RandomSource {
  /**
   * Returns a random number.
   *
   * @returns A number in the range `[0, 1)`.
   */
  next(): number;
}
