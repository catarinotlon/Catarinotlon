import {
  confirmRegistration,
  registerRunner,
  submitForReview,
  type RegisterRunnerError,
  type Registration,
  type RegistrationSettingsReader,
} from '@/modules/registration';
import type { Ticket } from '@/modules/ticketing';
import { sendAfterCommit, type EmailSender } from '@/shared/domain/email';
import type { ErrorReporter } from '@/shared/domain/error-reporter';
import { ok, type Result } from '@/shared/domain/result';
import type { Clock, IdGenerator, RandomSource } from '@/shared/domain/system-ports';
import type { UnitOfWork } from '@/shared/domain/unit-of-work';

import type { PaymentRepositories } from '../ports/payment-support';

/** Ports required by {@link registerManually}. */
export interface RegisterManuallyDeps {
  /** Transaction runner over the payment repositories. */
  readonly unitOfWork: UnitOfWork<PaymentRepositories>;
  /** Reader of the fee and the shirt sizes. */
  readonly settings: RegistrationSettingsReader;
  /** Email sender. */
  readonly emails: EmailSender;
  /** Reporter of unexpected errors. */
  readonly reporter: ErrorReporter;
  /** Time source. */
  readonly clock: Clock;
  /** UUID source. */
  readonly ids: IdGenerator;
  /** Random source for bib numbers. */
  readonly random: RandomSource;
}

/** Input of {@link registerManually}. */
export interface RegisterManuallyInput {
  /** The admin. The caller must have verified the role. */
  readonly adminId: string;
  /** The runner's full name. */
  readonly runnerName: string;
  /** The distance. */
  readonly distance: string;
  /** The shirt size. */
  readonly shirtSize: string;
  /** The shirt name. */
  readonly shirtName: string;
  /** The locale for the runner's emails. */
  readonly locale: string;
  /** Optional contact email. */
  readonly contactEmail: string;
  /** Optional contact phone. */
  readonly contactPhone: string;
  /** Whether the admin already received the payment. */
  readonly paymentReceived: boolean;
}

/** Result of {@link registerManually}. */
export interface ManualRegistration {
  /** The new registration. */
  readonly registration: Registration;
  /** The ticket, when the payment was already received. */
  readonly ticket: Ticket | null;
}

/**
 * Registers someone by hand, for example a person who paid in person.
 *
 * @remarks
 * The registration has no account. Marking the payment as received confirms it
 * at once and issues the ticket in the same transaction.
 *
 * @param deps - The required ports.
 * @param input - The runner's data and the payment flag.
 * @returns The registration and its ticket, or an expected error.
 *
 * @example
 * ```ts
 * await registerManually(deps, { adminId, runnerName, ..., paymentReceived: true });
 * ```
 */
export async function registerManually(
  deps: RegisterManuallyDeps,
  input: RegisterManuallyInput,
): Promise<Result<ManualRegistration, RegisterRunnerError>> {
  const outcome = await deps.unitOfWork.run(async ({ registrations, tickets }) => {
    const created = await registerRunner(
      {
        registrations,
        settings: deps.settings,
        clock: deps.clock,
        ids: deps.ids,
        random: deps.random,
      },
      {
        ownerId: null,
        runnerName: input.runnerName,
        distance: input.distance,
        shirtSize: input.shirtSize,
        shirtName: input.shirtName,
        locale: input.locale,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
      },
    );
    if (!created.ok) return created;
    if (!input.paymentReceived) return ok({ registration: created.value, ticket: null });

    const inReview = submitForReview(created.value);
    const confirmed = inReview.ok ? confirmRegistration(inReview.value) : inReview;
    if (!confirmed.ok) throw new Error(`Manual registration failed: ${confirmed.error.code}`);

    const ticket: Ticket = {
      id: deps.ids.uuid(),
      registrationId: confirmed.value.id,
      issuedAt: deps.clock.now(),
    };
    await registrations.update(confirmed.value);
    await tickets.insert(ticket);
    return ok({ registration: confirmed.value, ticket });
  });

  if (!outcome.ok) return outcome;

  const { registration, ticket } = outcome.value;
  if (ticket && registration.contactEmail) {
    await sendAfterCommit(deps, {
      template: 'registration_confirmed',
      to: registration.contactEmail,
      locale: registration.locale,
      idempotencyKey: `registration_confirmed:${registration.id}`,
      data: {
        runnerName: registration.runnerName,
        distance: registration.distance,
        bibNumber: registration.bibNumber,
        shirtName: registration.shirtName,
        shirtSize: registration.shirtSize,
        ticketId: ticket.id,
        accountUrl: null,
      },
    });
  }

  return outcome;
}
