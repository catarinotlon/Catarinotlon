import type { MenuAccount } from '@/shared/ui/site-menu';

import type { RunnerPanel } from '../application/use-cases/account-overview';

const PAYABLE = new Set(['pending_payment', 'receipt_rejected']);

/**
 * Maps an account's runners to what the phone menu shows.
 *
 * @remarks
 * Only the name, distance, bib number, and stage reach the menu. A runner is payable while
 * the registration waits for a payment, including after a rejected receipt; none is while
 * payment is closed, so the menu never leads to a closed transfer screen.
 *
 * @param name - The account holder's name.
 * @param panels - The account's runners, from the account overview.
 * @param paymentOpen - Whether the event settings allow paying.
 * @returns The account as the menu shows it.
 *
 * @example
 * ```ts
 * const account = toMenuAccount(user.name, await getAccountRunners(user.id), isPaymentOpen(settings));
 * ```
 */
export function toMenuAccount(
  name: string,
  panels: readonly RunnerPanel[],
  paymentOpen: boolean,
): MenuAccount {
  return {
    name,
    runners: panels.map(({ registration, stage }) => ({
      id: registration.id,
      name: registration.runnerName,
      distance: registration.distance,
      bibNumber: registration.bibNumber,
      stage,
    })),
    payableCount: paymentOpen ? panels.filter((item) => PAYABLE.has(item.stage)).length : 0,
  };
}
