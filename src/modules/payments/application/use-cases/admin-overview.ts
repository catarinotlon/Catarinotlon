import type { Registration } from '@/modules/registration';
import type { KitPickup } from '@/modules/ticketing';

import type { Payment } from '../../domain/payment';

/** The payment state shown in the admin table. */
export type AdminPaymentState = 'paid' | 'in_review' | 'pending';

/** One runner in the admin table. */
export interface AdminRow {
  /** The registration's UUID. */
  readonly id: string;
  /** The runner's full name. */
  readonly runnerName: string;
  /** The account's email, or the contact email of a manual registration. */
  readonly email: string | null;
  /** The race distance. */
  readonly distance: string;
  /** The shirt size. */
  readonly shirtSize: string;
  /** The name on the shirt. */
  readonly shirtName: string;
  /** The bib number. */
  readonly bibNumber: string;
  /** The payment state. */
  readonly paymentState: AdminPaymentState;
  /** Whether the kit has been delivered. */
  readonly kitDelivered: boolean;
  /** The payment to review, while one is in review. */
  readonly reviewPaymentId: string | null;
}

/** Filters of the admin table. */
export interface AdminRowFilter {
  /** Free text matched against name, email, and bib number. */
  readonly query?: string;
  /** Only this distance. */
  readonly distance?: string;
  /** Only this payment state. */
  readonly payment?: string;
  /** `delivered` or `waiting`. */
  readonly kit?: string;
}

/** The counts at the top of the admin panel. */
export interface AdminTotals {
  /** All runners. */
  readonly total: number;
  /** Runners in the 3K. */
  readonly three: number;
  /** Runners in the 5K. */
  readonly five: number;
  /** Runners with a payment in review. */
  readonly inReview: number;
  /** Runners with a payment pending. */
  readonly pending: number;
  /** Kits delivered. */
  readonly kitsDelivered: number;
}

const PAYMENT_STATES: Readonly<Record<Registration['status'], AdminPaymentState>> = {
  confirmed: 'paid',
  payment_in_review: 'in_review',
  pending_payment: 'pending',
};

const fold = (text: string): string =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/**
 * Builds the rows of the admin registrations table.
 *
 * @param registrations - Every active registration.
 * @param emails - Account emails, by user ID.
 * @param payments - Every active payment.
 * @param pickups - The deliveries in effect.
 * @returns One row per registration.
 *
 * @example
 * ```ts
 * const rows = buildAdminRows(registrations, emails, payments, pickups);
 * ```
 */
export function buildAdminRows(
  registrations: readonly Registration[],
  emails: ReadonlyMap<string, string>,
  payments: readonly Payment[],
  pickups: readonly KitPickup[],
): AdminRow[] {
  const delivered = new Set(pickups.map((item) => item.registrationId));

  return registrations.map((item) => {
    const inReview = item.status === 'payment_in_review';
    const review = inReview
      ? payments.find(
          (payment) => payment.status === 'in_review' && payment.registrationIds.includes(item.id),
        )
      : undefined;

    return {
      id: item.id,
      runnerName: item.runnerName,
      email: item.ownerId ? (emails.get(item.ownerId) ?? null) : item.contactEmail,
      distance: item.distance,
      shirtSize: item.shirtSize,
      shirtName: item.shirtName,
      bibNumber: item.bibNumber,
      paymentState: PAYMENT_STATES[item.status],
      kitDelivered: delivered.has(item.id),
      reviewPaymentId: review?.id ?? null,
    };
  });
}

/**
 * Filters the admin table.
 *
 * @remarks
 * The text search ignores accents and casing.
 *
 * @param rows - The rows.
 * @param filter - The filters.
 * @returns The matching rows, in their original order.
 */
export function filterAdminRows(rows: readonly AdminRow[], filter: AdminRowFilter): AdminRow[] {
  const query = fold(filter.query ?? '');
  return rows.filter(
    (row) =>
      (!filter.distance || row.distance === filter.distance) &&
      (!filter.payment || row.paymentState === filter.payment) &&
      (!filter.kit || row.kitDelivered === (filter.kit === 'delivered')) &&
      (!query ||
        [row.runnerName, row.email ?? '', row.bibNumber].some((text) =>
          fold(text).includes(query),
        )),
  );
}

/**
 * Counts the runners for the admin panel.
 *
 * @param rows - The rows.
 * @returns The totals.
 */
export function adminTotals(rows: readonly AdminRow[]): AdminTotals {
  const count = (matches: (row: AdminRow) => boolean) => rows.filter(matches).length;
  return {
    total: rows.length,
    three: count((row) => row.distance === '3K'),
    five: count((row) => row.distance === '5K'),
    inReview: count((row) => row.paymentState === 'in_review'),
    pending: count((row) => row.paymentState === 'pending'),
    kitsDelivered: count((row) => row.kitDelivered),
  };
}
