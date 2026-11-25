import type { AdminPaymentState } from '../application/use-cases/admin-overview';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Tells whether a scanned QR code can be a ticket.
 *
 * @remarks
 * A ticket's QR carries its UUID and nothing else, so any other text (a link, a
 * bib number) is some other code and needs no trip to the server.
 *
 * @param value - The text read from the QR code.
 * @returns Whether it is shaped like a ticket UUID.
 *
 * @example
 * ```ts
 * isTicketCode('https://example.com'); // false
 * ```
 */
export function isTicketCode(value: string): boolean {
  return UUID.test(value.trim());
}

/** What the kit pickup screen tells the admin to do with a runner's kit. */
export type KitVerdict = 'ready' | 'delivered' | 'unpaid';

/**
 * Decides what to do with a runner's kit.
 *
 * @remarks
 * A kit is only delivered for a confirmed (paid) registration, and only once.
 *
 * @param runner - The runner's payment state and whether the kit was delivered.
 * @returns `ready` to deliver, `delivered` if it already was, `unpaid` if it must not be.
 *
 * @example
 * ```ts
 * kitVerdict({ paymentState: 'paid', kitDelivered: false }); // 'ready'
 * ```
 */
export function kitVerdict(runner: {
  readonly paymentState: AdminPaymentState;
  readonly kitDelivered: boolean;
}): KitVerdict {
  if (runner.kitDelivered) return 'delivered';
  return runner.paymentState === 'paid' ? 'ready' : 'unpaid';
}

/**
 * Builds a filter that ignores a QR code read again right after the first time.
 *
 * @remarks
 * The camera keeps reading while the ticket is still in front of it; without
 * this, one ticket would open its kit several times.
 *
 * @param windowMs - How long the same code is ignored, in milliseconds.
 * @returns A function that says whether a code read at `now` should be handled.
 *
 * @example
 * ```ts
 * const accept = createRepeatGuard(3000);
 * accept(code, Date.now()); // true, then false for the next 3 s
 * ```
 */
export function createRepeatGuard(windowMs: number): (code: string, now: number) => boolean {
  let last: { code: string; at: number } | undefined;
  return (code, now) => {
    if (last && last.code === code && now - last.at < windowMs) return false;
    last = { code, at: now };
    return true;
  };
}
