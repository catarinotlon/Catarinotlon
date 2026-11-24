import type { EventSettingsValues, SettingKey } from '../../domain/event-settings';

/** One saved version of the event settings. */
export interface EventSettingsVersion {
  /** Version UUID. */
  readonly id: string;
  /** The complete settings at this version. */
  readonly values: EventSettingsValues;
  /** What changed from the previous version. */
  readonly changedFields: readonly SettingKey[];
  /** The admin who saved it. */
  readonly changedBy: string;
  /** When it was saved. */
  readonly createdAt: Date;
}

/**
 * Append-only store of event settings.
 *
 * @remarks
 * A version is never updated or removed. The current value is the latest one.
 *
 * @example
 * ```ts
 * const current = await repository.latest();
 * ```
 */
export interface EventSettingsRepository {
  /**
   * Reads the latest version.
   *
   * @returns The version, or `null` before the first save.
   */
  latest(): Promise<EventSettingsVersion | null>;

  /**
   * Lists every version, newest first.
   *
   * @returns The history.
   */
  history(): Promise<EventSettingsVersion[]>;

  /**
   * Appends a new version.
   *
   * @param version - The version.
   */
  append(version: EventSettingsVersion): Promise<void>;
}

/** Re-checks an admin's password before a sensitive change. */
export interface PasswordVerifier {
  /**
   * Verifies a password.
   *
   * @param userId - The admin's user ID.
   * @param password - The password they re-entered.
   * @returns `true` when it is correct.
   */
  verify(userId: string, password: string): Promise<boolean>;
}

/** The admin recipients of a sensitive-change alert. */
export interface AdminRecipients {
  /**
   * Lists the admin email addresses.
   *
   * @returns The addresses on the allowlist.
   */
  adminEmails(): Promise<readonly string[]>;
}

/** Builds the link to the settings screen. */
export interface SettingsLinks {
  /**
   * Builds the settings link.
   *
   * @param locale - The email's locale.
   * @returns The absolute URL of the settings screen.
   */
  settings(locale: string): string;
}
