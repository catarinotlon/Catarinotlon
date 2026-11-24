/** The event settings a new registration depends on. */
export interface RegistrationSettings {
  /** The registration fee in force, in cents. */
  readonly feeCents: number;
  /** The shirt sizes currently offered. */
  readonly shirtSizes: readonly string[];
}

/** Reads the settings needed to open registration. */
export interface RegistrationSettingsReader {
  /**
   * Reads the current registration settings.
   *
   * @returns The settings, or `null` while the fee or the sizes are missing.
   *
   * @example
   * ```ts
   * const settings = await reader.read();
   * if (!settings) return err('registration.not_open');
   * ```
   */
  read(): Promise<RegistrationSettings | null>;
}
