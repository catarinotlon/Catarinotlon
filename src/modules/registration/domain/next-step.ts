import type { RegistrationStatus } from './registration';

/** Where an account holder should land after signing in. */
export type NextStep = 'register' | 'payment' | 'account';

/**
 * Decides where to send an account holder after signing in.
 *
 * @param registrations - The account's registrations.
 * @returns `register` with none, `payment` with an unpaid runner, else `account`.
 */
export function nextStepAfterSignIn(
  registrations: readonly { readonly status: RegistrationStatus }[],
): NextStep {
  if (registrations.length === 0) return 'register';
  return registrations.some((item) => item.status === 'pending_payment') ? 'payment' : 'account';
}
