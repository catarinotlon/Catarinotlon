import { sendAfterCommit, type EmailSender } from '@/shared/domain/email';
import type { ErrorReporter } from '@/shared/domain/error-reporter';

import { reminderDaysLeft, type ReminderDaysLeft } from '../../domain/race-reminder';
import type { RegistrationRepository } from '../ports/registration-repository';
import type { AccountEmailLookup, AccountLinks } from './runner-edits';

/** Ports required by {@link sendRaceReminders}. */
export interface SendRaceRemindersDeps {
  /** Registration storage. */
  readonly registrations: RegistrationRepository;
  /** Email sender. */
  readonly emails: EmailSender;
  /** Reporter of unexpected errors. */
  readonly reporter: ErrorReporter;
  /** Account email lookup. */
  readonly contact: AccountEmailLookup;
  /** Email link builder. */
  readonly links: AccountLinks;
}

/**
 * Reminds every confirmed runner, three days and one day before the race.
 *
 * @remarks
 * It runs every day and sends only on a reminder day. Kit pickup is on race
 * day, so each reminder also carries the pickup details. The idempotency key
 * combines the registration and the days left, so a repeated run sends
 * nothing new. One failed email does not stop the others.
 *
 * @param deps - The required ports.
 * @param input - The race day and today's date in the event's time zone, both `YYYY-MM-DD`.
 * @returns How many reminders were attempted, and which reminder day today is.
 *
 * @example
 * ```ts
 * await sendRaceReminders(deps, { eventDate: '2026-12-19', today: '2026-12-16' });
 * ```
 */
export async function sendRaceReminders(
  deps: SendRaceRemindersDeps,
  input: { readonly eventDate: string | null; readonly today: string },
): Promise<{ sent: number; daysLeft: ReminderDaysLeft | null }> {
  const daysLeft = reminderDaysLeft(input.eventDate, input.today);
  if (daysLeft === null) return { sent: 0, daysLeft };

  const all = await deps.registrations.listAll();
  let sent = 0;

  for (const registration of all) {
    if (registration.status !== 'confirmed') continue;

    const to = registration.ownerId
      ? await deps.contact.emailOf(registration.ownerId)
      : registration.contactEmail;
    if (!to) continue;

    await sendAfterCommit(deps, {
      template: 'race_reminder',
      to,
      locale: registration.locale,
      idempotencyKey: `race_reminder:${registration.id}:${daysLeft}d`,
      data: {
        runnerName: registration.runnerName,
        distance: registration.distance,
        bibNumber: registration.bibNumber,
        accountUrl: deps.links.account(registration.locale),
        daysLeft,
      },
    });
    sent += 1;
  }

  return { sent, daysLeft };
}
