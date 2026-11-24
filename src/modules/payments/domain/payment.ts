import { err, ok, type DomainError, type Result } from '@/shared/domain/result';

/** Metadata of an uploaded transfer receipt. The bytes live in file storage. */
export interface ReceiptFile {
  /** Path of the file in the private store. */
  readonly pathname: string;
  /** The file's MIME type. */
  readonly contentType: string;
  /** The file's size in bytes. */
  readonly sizeBytes: number;
  /** When the file was uploaded. */
  readonly uploadedAt: Date;
}

/** A registration covered by a payment, with the fee it stored at creation. */
export interface CoveredRegistration {
  /** The registration's UUID. */
  readonly registrationId: string;
  /** The fee stored on the registration, in cents. */
  readonly feeCents: number;
}

/** The data needed to create a payment. */
export interface NewPayment {
  /** Payment UUID. */
  readonly id: string;
  /** The account that uploaded the receipt. */
  readonly ownerId: string;
  /** The generated bank transfer concept. */
  readonly concept: string;
  /** The account's unpaid registrations at upload time. */
  readonly covered: readonly CoveredRegistration[];
  /** The uploaded receipt. */
  readonly receipt: ReceiptFile;
  /** When the payment was created. */
  readonly createdAt: Date;
}

/** The review state of a payment. */
export type PaymentStatus = 'in_review' | 'confirmed' | 'rejected';

/** One bank transfer, backed by a receipt, covering one or more registrations. */
export interface Payment {
  /** Payment UUID. */
  readonly id: string;
  /** The account that uploaded the receipt. */
  readonly ownerId: string;
  /** The generated bank transfer concept. */
  readonly concept: string;
  /** The current review state. */
  readonly status: PaymentStatus;
  /** The registrations this payment covers. */
  readonly registrationIds: readonly string[];
  /** The expected amount, in cents. */
  readonly amountCents: number;
  /** The current receipt. */
  readonly receipt: ReceiptFile;
  /** Replaced receipts, which are kept indefinitely. */
  readonly previousReceipts: readonly ReceiptFile[];
  /** The admin who reviewed the payment. */
  readonly reviewedBy: string | null;
  /** When the payment was reviewed. */
  readonly reviewedAt: Date | null;
  /** The admin's reason, when rejected. */
  readonly rejectionReason: string | null;
  /** When the payment was created. */
  readonly createdAt: Date;
}

/** Who reviewed a payment and when. */
export interface PaymentReview {
  /** The reviewing admin's user ID. */
  readonly reviewerId: string;
  /** When the review happened. */
  readonly at: Date;
}

/** Error returned when there are no registrations to pay for. */
export type NothingToPay = DomainError<'payments.nothing_to_pay'>;
/** Error returned when a payment has already been reviewed. */
export type PaymentNotInReview = DomainError<'payments.not_in_review'>;
/** Error returned when a rejection has no reason. */
export type RejectionReasonRequired = DomainError<'payments.rejection_reason_required'>;

/**
 * Creates a payment under review.
 *
 * @remarks
 * The amount adds up the fee stored on each registration, because a price change
 * never affects what an existing registration owes.
 *
 * @param input - The payment data.
 * @returns The payment, or `payments.nothing_to_pay`.
 *
 * @example
 * ```ts
 * const result = createPayment(input);
 * ```
 */
export function createPayment(input: NewPayment): Result<Payment, NothingToPay> {
  if (input.covered.length === 0) return err('payments.nothing_to_pay');

  return ok({
    id: input.id,
    ownerId: input.ownerId,
    concept: input.concept,
    status: 'in_review',
    registrationIds: input.covered.map((item) => item.registrationId),
    amountCents: input.covered.reduce((total, item) => total + item.feeCents, 0),
    receipt: input.receipt,
    previousReceipts: [],
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: null,
    createdAt: input.createdAt,
  });
}

/**
 * Replaces the receipt of a payment still under review.
 *
 * @param payment - The payment.
 * @param receipt - The new receipt.
 * @returns The updated payment, or `payments.not_in_review`.
 */
export function replaceReceipt(
  payment: Payment,
  receipt: ReceiptFile,
): Result<Payment, PaymentNotInReview> {
  if (payment.status !== 'in_review') return err('payments.not_in_review');
  return ok({
    ...payment,
    receipt,
    previousReceipts: [...payment.previousReceipts, payment.receipt],
  });
}

/**
 * Confirms a payment under review.
 *
 * @param payment - The payment.
 * @param review - Who confirmed it and when.
 * @returns The confirmed payment, or `payments.not_in_review`.
 */
export function confirmPayment(
  payment: Payment,
  review: PaymentReview,
): Result<Payment, PaymentNotInReview> {
  if (payment.status !== 'in_review') return err('payments.not_in_review');
  return ok({
    ...payment,
    status: 'confirmed',
    reviewedBy: review.reviewerId,
    reviewedAt: review.at,
  });
}

/**
 * Rejects a payment under review.
 *
 * @param payment - The payment.
 * @param review - The reason, who rejected it, and when.
 * @returns The rejected payment, or an error code.
 */
export function rejectPayment(
  payment: Payment,
  review: PaymentReview & { readonly reason: string },
): Result<Payment, PaymentNotInReview | RejectionReasonRequired> {
  if (payment.status !== 'in_review') return err('payments.not_in_review');

  const reason = review.reason.trim();
  if (!reason) return err('payments.rejection_reason_required');

  return ok({
    ...payment,
    status: 'rejected',
    rejectionReason: reason,
    reviewedBy: review.reviewerId,
    reviewedAt: review.at,
  });
}
