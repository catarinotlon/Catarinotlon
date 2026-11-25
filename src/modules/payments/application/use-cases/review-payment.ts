import {
  confirmRegistration,
  returnToPendingPayment,
  type Registration,
  type RegistrationRepository,
} from '@/modules/registration';
import type { Ticket } from '@/modules/ticketing';
import { sendAfterCommit, type EmailSender } from '@/shared/domain/email';
import type { ErrorReporter } from '@/shared/domain/error-reporter';
import { err, ok, type DomainError, type Result } from '@/shared/domain/result';
import type { Clock, IdGenerator } from '@/shared/domain/system-ports';
import type { UnitOfWork } from '@/shared/domain/unit-of-work';

import {
  confirmPayment,
  rejectPayment,
  type Payment,
  type PaymentNotInReview,
  type RejectionReasonRequired,
} from '../../domain/payment';
import type { PaymentContacts, PaymentLinks, PaymentRepositories } from '../ports/payment-support';

/** Ports required by the payment review use cases. */
export interface ReviewPaymentDeps {
  /** Transaction runner over the payment repositories. */
  readonly unitOfWork: UnitOfWork<PaymentRepositories>;
  /** Contact lookup. */
  readonly contacts: PaymentContacts;
  /** Email link builder. */
  readonly links: PaymentLinks;
  /** Email sender. */
  readonly emails: EmailSender;
  /** Reporter of unexpected errors. */
  readonly reporter: ErrorReporter;
  /** Time source. */
  readonly clock: Clock;
  /** UUID source. */
  readonly ids: IdGenerator;
}

/** Error returned when a payment does not exist. */
export type PaymentNotFound = DomainError<'payments.not_found'>;

async function coveredRegistrations(
  registrations: RegistrationRepository,
  payment: Payment,
): Promise<Registration[]> {
  const found = await Promise.all(payment.registrationIds.map((id) => registrations.findById(id)));
  if (found.some((item) => item === null)) {
    throw new Error(`Payment ${payment.id} covers a registration that is not active`);
  }
  return found as Registration[];
}

function unwrap<T>(result: Result<T>, paymentId: string): T {
  if (!result.ok) {
    throw new Error(`Payment ${paymentId} has an inconsistent registration: ${result.error.code}`);
  }
  return result.value;
}

/**
 * Confirms a payment: every covered registration is confirmed and gets a ticket.
 *
 * @remarks
 * This is the only path to `confirmed` for a paid registration. All writes share
 * one transaction, and the emails go out after it commits. The caller must have
 * verified that `adminId` is an admin.
 *
 * @param deps - The required ports.
 * @param input - The payment and the reviewing admin.
 * @returns The confirmed payment, or an expected error.
 *
 * @example
 * ```ts
 * const result = await confirmPaymentReview(deps, { paymentId, adminId });
 * ```
 */
export async function confirmPaymentReview(
  deps: ReviewPaymentDeps,
  input: { readonly paymentId: string; readonly adminId: string },
): Promise<Result<Payment, PaymentNotFound | PaymentNotInReview>> {
  const outcome = await deps.unitOfWork.run(async ({ payments, registrations, tickets }) => {
    const payment = await payments.findById(input.paymentId);
    if (!payment) return { result: err('payments.not_found' as const), issued: [] };

    const now = deps.clock.now();
    const confirmed = confirmPayment(payment, { reviewerId: input.adminId, at: now });
    if (!confirmed.ok) return { result: confirmed, issued: [] };

    const covered = await coveredRegistrations(registrations, payment);
    const issued: { registration: Registration; ticket: Ticket }[] = [];
    for (const registration of covered) {
      const updated = unwrap(confirmRegistration(registration), payment.id);
      const ticket: Ticket = {
        id: deps.ids.uuid(),
        registrationId: registration.id,
        issuedAt: now,
      };
      await registrations.update(updated);
      await tickets.insert(ticket);
      issued.push({ registration: updated, ticket });
    }
    await payments.update(confirmed.value);
    return { result: confirmed, issued };
  });

  if (!outcome.result.ok) return outcome.result;
  const payment = outcome.result.value;

  const holder = await deps.contacts.accountHolder(payment.ownerId);
  if (holder) {
    for (const { registration, ticket } of outcome.issued) {
      await sendAfterCommit(deps, {
        template: 'registration_confirmed',
        to: holder.email,
        locale: registration.locale,
        idempotencyKey: `registration_confirmed:${registration.id}`,
        data: {
          runnerName: registration.runnerName,
          distance: registration.distance,
          bibNumber: registration.bibNumber,
          shirtName: registration.shirtName,
          shirtSize: registration.shirtSize,
          ticketId: ticket.id,
          accountUrl: deps.links.runner(registration.id, registration.locale),
        },
      });
    }
  }

  return ok(payment);
}

/**
 * Rejects a payment: every covered registration returns to `pending_payment`.
 *
 * @remarks
 * Registrations keep their bib numbers. The receipt stays on file. The caller
 * must have verified that `adminId` is an admin.
 *
 * @param deps - The required ports.
 * @param input - The payment, the reviewing admin, and the reason.
 * @returns The rejected payment, or an expected error.
 *
 * @example
 * ```ts
 * const result = await rejectPaymentReview(deps, { paymentId, adminId, reason });
 * ```
 */
export async function rejectPaymentReview(
  deps: ReviewPaymentDeps,
  input: { readonly paymentId: string; readonly adminId: string; readonly reason: string },
): Promise<Result<Payment, PaymentNotFound | PaymentNotInReview | RejectionReasonRequired>> {
  const outcome = await deps.unitOfWork.run(async ({ payments, registrations }) => {
    const payment = await payments.findById(input.paymentId);
    if (!payment) return { result: err('payments.not_found' as const), covered: [] };

    const rejected = rejectPayment(payment, {
      reason: input.reason,
      reviewerId: input.adminId,
      at: deps.clock.now(),
    });
    if (!rejected.ok) return { result: rejected, covered: [] };

    const covered = await coveredRegistrations(registrations, payment);
    for (const registration of covered) {
      await registrations.update(unwrap(returnToPendingPayment(registration), payment.id));
    }
    await payments.update(rejected.value);
    return { result: rejected, covered };
  });

  if (!outcome.result.ok) return outcome.result;
  const payment = outcome.result.value;

  const holder = await deps.contacts.accountHolder(payment.ownerId);
  if (holder) {
    await sendAfterCommit(deps, {
      template: 'receipt_rejected',
      to: holder.email,
      locale: holder.locale,
      idempotencyKey: `receipt_rejected:${payment.id}`,
      data: {
        reason: payment.rejectionReason ?? '',
        uploadUrl: deps.links.payment(holder.locale),
      },
    });
  }

  return ok(payment);
}
