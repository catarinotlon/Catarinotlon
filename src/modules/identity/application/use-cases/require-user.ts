import { err, ok, type DomainError, type Result } from '@/shared/domain/result';

import { isAdmin } from '../../domain/admin-policy';
import type { CurrentUser, CurrentUserProvider } from '../ports/current-user-provider';

/** Error returned when a signed-in user is required. */
export type NotSignedIn = DomainError<'identity.not_signed_in'>;
/** Error returned when an admin is required. */
export type NotAdmin = DomainError<'identity.not_admin'>;

/**
 * Requires a signed-in user.
 *
 * @param deps - The current user provider.
 * @returns The user, or `identity.not_signed_in`.
 *
 * @example
 * ```ts
 * const user = await requireUser({ currentUser });
 * ```
 */
export async function requireUser(deps: {
  readonly currentUser: CurrentUserProvider;
}): Promise<Result<CurrentUser, NotSignedIn>> {
  const user = await deps.currentUser.current();
  return user ? ok(user) : err('identity.not_signed_in');
}

/**
 * Requires an admin, deriving the role from the allowlist on every call.
 *
 * @remarks
 * Signed-out visitors get the same error as runners, so admin routes reveal
 * nothing to either.
 *
 * @param deps - The current user provider and the allowlist.
 * @returns The admin, or `identity.not_admin`.
 *
 * @example
 * ```ts
 * const admin = await requireAdmin({ currentUser, adminEmails });
 * ```
 */
export async function requireAdmin(deps: {
  readonly currentUser: CurrentUserProvider;
  readonly adminEmails: readonly string[];
}): Promise<Result<CurrentUser, NotAdmin>> {
  const user = await deps.currentUser.current();
  return user && isAdmin(user, deps.adminEmails) ? ok(user) : err('identity.not_admin');
}
