import { sendAfterCommit, type EmailSender } from '@/shared/domain/email';
import type { ErrorReporter } from '@/shared/domain/error-reporter';
import { err, ok, type DomainError, type Result } from '@/shared/domain/result';
import type { Clock, IdGenerator } from '@/shared/domain/system-ports';

import {
  bankDataChanged,
  changedFields,
  validateSettings,
  type EventSettingsValues,
  type InvalidSettings,
} from '../../domain/event-settings';
import type {
  AdminRecipients,
  EventSettingsRepository,
  PasswordVerifier,
  SettingsLinks,
} from '../ports/event-settings-repository';
import { readEventSettings } from './read-event-settings';

const ADMIN_LOCALE = 'es';

/** Ports required by {@link updateEventSettings}. */
export interface UpdateEventSettingsDeps {
  /** Settings storage. */
  readonly settings: EventSettingsRepository;
  /** Password re-check for bank data changes. */
  readonly passwords: PasswordVerifier;
  /** Recipients of the bank data alert. */
  readonly admins: AdminRecipients;
  /** Email link builder. */
  readonly links: SettingsLinks;
  /** Email sender. */
  readonly emails: EmailSender;
  /** Reporter of unexpected errors. */
  readonly reporter: ErrorReporter;
  /** Time source. */
  readonly clock: Clock;
  /** UUID source. */
  readonly ids: IdGenerator;
}

/** Input of {@link updateEventSettings}. */
export interface UpdateEventSettingsInput {
  /** The admin saving the change. The caller must have verified the role. */
  readonly adminId: string;
  /** The admin's name, shown in the alert to other admins. */
  readonly adminName: string;
  /** The complete new settings. */
  readonly values: EventSettingsValues;
  /** The admin's password, required when the bank data changes. */
  readonly password?: string;
}

/** Expected failures of {@link updateEventSettings}. */
export type UpdateEventSettingsError =
  InvalidSettings | DomainError<'event.password_required'> | DomainError<'event.wrong_password'>;

/**
 * Saves the event settings as a new version.
 *
 * @remarks
 * Versions are appended and never overwritten. Changing the bank data requires
 * the admin's password and alerts every admin. The alert does not carry the data.
 *
 * @param deps - The required ports.
 * @param input - The admin and the new settings.
 * @returns The saved settings, or an expected error.
 *
 * @example
 * ```ts
 * const result = await updateEventSettings(deps, { adminId, adminName, values });
 * ```
 */
export async function updateEventSettings(
  deps: UpdateEventSettingsDeps,
  input: UpdateEventSettingsInput,
): Promise<Result<EventSettingsValues, UpdateEventSettingsError>> {
  const validated = validateSettings(input.values);
  if (!validated.ok) return validated;

  const previous = await readEventSettings(deps);
  const changed = changedFields(previous, input.values);
  if (changed.length === 0) return ok(input.values);

  const bankChanged = bankDataChanged(changed);
  if (bankChanged) {
    if (!input.password) return err('event.password_required');
    const correct = await deps.passwords.verify(input.adminId, input.password);
    if (!correct) return err('event.wrong_password');
  }

  const versionId = deps.ids.uuid();
  await deps.settings.append({
    id: versionId,
    values: input.values,
    changedFields: changed,
    changedBy: input.adminId,
    createdAt: deps.clock.now(),
  });

  if (bankChanged) {
    for (const to of await deps.admins.adminEmails()) {
      await sendAfterCommit(deps, {
        template: 'bank_data_changed',
        to,
        locale: ADMIN_LOCALE,
        idempotencyKey: `bank_data_changed:${versionId}:${to}`,
        data: {
          changedBy: input.adminName,
          settingsUrl: deps.links.settings(ADMIN_LOCALE),
        },
      });
    }
  }

  return ok(input.values);
}
