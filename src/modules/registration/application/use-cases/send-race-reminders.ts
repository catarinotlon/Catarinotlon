import { sendAfterCommit, type EmailSender } from '@/shared/domain/email';
import type { ErrorReporter } from '@/shared/domain/error-reporter';

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
 * Reminds every confirmed runner about kit pickup or race day.
 *
 * @remarks
 * The idempotency key combines the campaign and the registration, so a repeated
 * run sends nothing new. One failed email does not stop the others.
 *
 * @param deps - The required ports.
 * @param input - The campaign's name, such as `kit-pickup`.
 * @returns How many reminders were attempted.
 *
 * @example
 * ```ts
 * await sendRaceReminders(deps, { campaign: 'kit-pickup' });
 * ```
 */
export async function sendRaceReminders(
  deps: SendRaceRemindersDeps,
  input: { readonly campaign: string },
): Promise<{ sent: number }> {
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
      idempotencyKey: `race_reminder:${registration.id}:${input.campaign}`,
      data: {
        runnerName: registration.runnerName,
        distance: registration.distance,
        bibNumber: registration.bibNumber,
        accountUrl: deps.links.account(registration.locale),
      },
    });
    sent += 1;
  }

  return { sent };
}
