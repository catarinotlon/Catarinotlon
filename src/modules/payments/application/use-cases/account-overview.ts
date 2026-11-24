import type { Registration } from '@/modules/registration';
import type { Ticket } from '@/modules/ticketing';

import type { Payment } from '../../domain/payment';
import { buildPaymentConcept } from '../../domain/payment-concept';

/** What the account page shows for a runner. */
export type RunnerStage =
  'pending_payment' | 'payment_in_review' | 'confirmed' | 'receipt_rejected';

/** Everything the account page shows for one selected runner. */
export interface RunnerPanel {
  /** The runner's registration. */
  readonly registration: Registration;
  /** The stage that decides which panel to show. */
  readonly stage: RunnerStage;
  /** The ticket, once confirmed. */
  readonly ticket: Ticket | null;
  /** The newest payment covering this runner. */
  readonly payment: Payment | null;
  /** The admin's reason, when the newest receipt was rejected. */
  readonly rejectionReason: string | null;
}

/** What the account still has to pay. */
export interface PaymentSummary {
  /** The unpaid runners. */
  readonly runners: readonly Registration[];
  /** The sum of the fees stored on those runners, in cents. */
  readonly totalCents: number;
  /** The concept for the bank transfer. */
  readonly concept: string;
}

function newestPaymentFor(registrationId: string, payments: readonly Payment[]): Payment | null {
  const covering = payments.filter((item) => item.registrationIds.includes(registrationId));
  return covering.reduce<Payment | null>(
    (newest, item) =>
      !newest || item.createdAt.getTime() >= newest.createdAt.getTime() ? item : newest,
    null,
  );
}

/**
 * Builds the per-runner view of an account.
 *
 * @remarks
 * Each panel holds only its own runner's data, so two runners are never mixed.
 *
 * @param registrations - The account's registrations.
 * @param payments - The account's payments.
 * @param tickets - The tickets of those registrations.
 * @returns One panel per runner, in the same order.
 *
 * @example
 * ```ts
 * const panels = buildAccountOverview(registrations, payments, tickets);
 * ```
 */
export function buildAccountOverview(
  registrations: readonly Registration[],
  payments: readonly Payment[],
  tickets: readonly Ticket[],
): RunnerPanel[] {
  return registrations.map((registration) => {
    const payment = newestPaymentFor(registration.id, payments);
    const rejected = registration.status === 'pending_payment' && payment?.status === 'rejected';
    return {
      registration,
      stage: rejected ? 'receipt_rejected' : registration.status,
      ticket: tickets.find((item) => item.registrationId === registration.id) ?? null,
      payment,
      rejectionReason: rejected ? (payment?.rejectionReason ?? null) : null,
    };
  });
}

/**
 * Summarizes what the account still has to pay.
 *
 * @param registrations - The account's registrations.
 * @param holderName - The account holder's full name.
 * @returns The unpaid runners, the total, and the transfer concept.
 *
 * @example
 * ```ts
 * const summary = buildPaymentSummary(registrations, 'Sofía Ramírez');
 * ```
 */
export function buildPaymentSummary(
  registrations: readonly Registration[],
  holderName: string,
): PaymentSummary {
  const runners = registrations.filter((item) => item.status === 'pending_payment');
  return {
    runners,
    totalCents: runners.reduce((total, item) => total + item.feeCents, 0),
    concept: buildPaymentConcept(holderName),
  };
}
