import { submitForReview, type Registration } from '@/modules/registration';
import type { EmailSender } from '@/shared/domain/email';
import type { ErrorReporter } from '@/shared/domain/error-reporter';
import { err, ok, type DomainError, type Result } from '@/shared/domain/result';
import type { Clock, IdGenerator } from '@/shared/domain/system-ports';
import type { UnitOfWork } from '@/shared/domain/unit-of-work';

import {
  createPayment,
  type NothingToPay,
  type Payment,
  type ReceiptFile,
} from '../../domain/payment';
import { buildPaymentConcept } from '../../domain/payment-concept';
import type {
  PaymentAvailability,
  PaymentContacts,
  PaymentLinks,
  PaymentRepositories,
} from '../ports/payment-support';
import { notifyReceiptUploaded } from './notify-receipt-uploaded';

/** Ports required by {@link submitReceipt}. */
export interface SubmitReceiptDeps {
  /** Transaction runner over the payment repositories. */
  readonly unitOfWork: UnitOfWork<PaymentRepositories>;
  /** Tells whether payment is open. */
  readonly availability: PaymentAvailability;
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

/** Input of {@link submitReceipt}. */
export interface SubmitReceiptInput {
  /** The signed-in account. */
  readonly ownerId: string;
  /** The uploaded receipt. */
  readonly receipt: ReceiptFile;
}

/** Expected failures of {@link submitReceipt}. */
export type SubmitReceiptError =
  NothingToPay | DomainError<'payments.closed'> | DomainError<'payments.account_not_found'>;

/**
 * Records a transfer receipt covering the account's unpaid registrations.
 *
 * @remarks
 * Uploading a receipt never confirms anything. Registrations that are already
 * confirmed or in review are left untouched.
 *
 * @param deps - The required ports.
 * @param input - The account and the receipt.
 * @returns The new payment, or an expected error.
 *
 * @example
 * ```ts
 * const result = await submitReceipt(deps, { ownerId, receipt });
 * ```
 */
export async function submitReceipt(
  deps: SubmitReceiptDeps,
  input: SubmitReceiptInput,
): Promise<Result<Payment, SubmitReceiptError>> {
  if (!(await deps.availability.isOpen())) return err('payments.closed');

  const holder = await deps.contacts.accountHolder(input.ownerId);
  if (!holder) return err('payments.account_not_found');

  const outcome = await deps.unitOfWork.run(async ({ payments, registrations }) => {
    const owned = await registrations.listByOwner(input.ownerId);
    const unpaid = owned.filter((item) => item.status === 'pending_payment');

    const created = createPayment({
      id: deps.ids.uuid(),
      ownerId: input.ownerId,
      concept: buildPaymentConcept(holder.name),
      covered: unpaid.map((item) => ({ registrationId: item.id, feeCents: item.feeCents })),
      receipt: input.receipt,
      createdAt: deps.clock.now(),
    });
    if (!created.ok) return { created, covered: [] as Registration[] };

    await payments.insert(created.value);
    for (const registration of unpaid) {
      const moved = submitForReview(registration);
      if (moved.ok) await registrations.update(moved.value);
    }
    return { created, covered: unpaid };
  });

  if (!outcome.created.ok) return outcome.created;
  const payment = outcome.created.value;
  const runners = outcome.covered.map((item) => ({
    name: item.runnerName,
    distance: item.distance,
  }));

  await notifyReceiptUploaded(deps, payment, holder, runners);

  return ok(payment);
}
