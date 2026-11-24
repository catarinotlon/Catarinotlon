import type { EmailSender } from '@/shared/domain/email';
import type { ErrorReporter } from '@/shared/domain/error-reporter';
import { err, ok, type Result } from '@/shared/domain/result';
import type { UnitOfWork } from '@/shared/domain/unit-of-work';

import {
  replaceReceipt,
  type Payment,
  type PaymentNotInReview,
  type ReceiptFile,
} from '../../domain/payment';
import type { PaymentRepository } from '../ports/payment-repository';
import type { PaymentContacts, PaymentLinks, PaymentRepositories } from '../ports/payment-support';
import { notifyReceiptUploaded } from './notify-receipt-uploaded';
import type { PaymentNotFound } from './review-payment';

/** Ports required by {@link replacePaymentReceipt}. */
export interface ReplaceReceiptDeps {
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
}

/**
 * Replaces the receipt of a payment still under review.
 *
 * @remarks
 * The replaced file stays on record. Another account's payment reads as not found.
 *
 * @param deps - The required ports.
 * @param input - The user, the payment, and the new receipt.
 * @returns The updated payment, or an expected error.
 *
 * @example
 * ```ts
 * await replacePaymentReceipt(deps, { userId, paymentId, receipt });
 * ```
 */
export async function replacePaymentReceipt(
  deps: ReplaceReceiptDeps,
  input: { readonly userId: string; readonly paymentId: string; readonly receipt: ReceiptFile },
): Promise<Result<Payment, PaymentNotFound | PaymentNotInReview>> {
  const outcome = await deps.unitOfWork.run(async ({ payments, registrations }) => {
    const payment = await payments.findById(input.paymentId);
    if (payment?.ownerId !== input.userId) {
      return { result: err('payments.not_found' as const), runners: [] };
    }

    const replaced = replaceReceipt(payment, input.receipt);
    if (!replaced.ok) return { result: replaced, runners: [] };

    await payments.update(replaced.value);
    const covered = await Promise.all(
      payment.registrationIds.map((id) => registrations.findById(id)),
    );
    return {
      result: replaced,
      runners: covered.flatMap((item) =>
        item ? [{ name: item.runnerName, distance: item.distance }] : [],
      ),
    };
  });

  if (!outcome.result.ok) return outcome.result;

  const holder = await deps.contacts.accountHolder(input.userId);
  if (holder) {
    await notifyReceiptUploaded(deps, outcome.result.value, holder, outcome.runners);
  }
  return ok(outcome.result.value);
}

/**
 * Authorizes reading a stored receipt.
 *
 * @remarks
 * Only the uploader and admins can read a receipt, and only a file recorded on
 * that payment. Anyone else gets the same answer as for a missing payment.
 *
 * @param deps - The payment repository.
 * @param input - The reader, the payment, and the requested file.
 * @returns The file to stream, or `payments.not_found`.
 *
 * @example
 * ```ts
 * const file = await authorizeReceiptRead(deps, { userId, isAdmin, paymentId, pathname });
 * ```
 */
export async function authorizeReceiptRead(
  deps: { readonly payments: PaymentRepository },
  input: {
    readonly userId: string;
    readonly isAdmin: boolean;
    readonly paymentId: string;
    readonly pathname: string;
  },
): Promise<Result<{ pathname: string; contentType: string }, PaymentNotFound>> {
  const payment = await deps.payments.findById(input.paymentId);
  if (!payment || (!input.isAdmin && payment.ownerId !== input.userId)) {
    return err('payments.not_found');
  }

  const file = [payment.receipt, ...payment.previousReceipts].find(
    (item) => item.pathname === input.pathname,
  );
  if (!file) return err('payments.not_found');

  return ok({ pathname: file.pathname, contentType: file.contentType });
}
