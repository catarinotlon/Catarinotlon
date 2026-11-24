import { sendAfterCommit, type EmailSender } from '@/shared/domain/email';
import type { ErrorReporter } from '@/shared/domain/error-reporter';
import { err, ok, type DomainError, type Result } from '@/shared/domain/result';
import type { Clock, IdGenerator } from '@/shared/domain/system-ports';

import { isAdmin } from '../../domain/admin-policy';
import { createAdminGrant, type AdminGrant, type InvalidEmail } from '../../domain/admin-grant';
import type { AdminGrantRepository } from '../ports/admin-grant-repository';
import type { CurrentUser, CurrentUserProvider } from '../ports/current-user-provider';

const ADMIN_LOCALE = 'es';

/** The signed-in user is not an owner. */
export type NotOwner = DomainError<'identity.not_owner'>;
/** The address already has admin access. */
export type AlreadyAdmin = DomainError<'identity.already_admin'>;
/** There is no active admin with that ID. */
export type AdminNotFound = DomainError<'identity.admin_not_found'>;

/** Ports required to manage the admin team. */
export interface AdminTeamDeps {
  /** Storage of the added admins. */
  readonly grants: AdminGrantRepository;
  /** The owners' addresses, from `ADMIN_EMAILS`. */
  readonly owners: readonly string[];
  /** Generator of grant IDs. */
  readonly ids: IdGenerator;
  /** Source of the current time. */
  readonly clock: Clock;
  /** Sends the "you are now an admin" email. */
  readonly emails: EmailSender;
  /** Receives a failed send, which never undoes the grant. */
  readonly reporter: ErrorReporter;
  /** Absolute links the email points to. */
  readonly links: {
    /** The sign-in page, in the given locale. */
    readonly signIn: (locale: string) => string;
  };
}

/**
 * Checks that the signed-in user is an owner, the only role that manages admins.
 *
 * @param deps - The current user and the owners' addresses.
 * @returns The owner, or `identity.not_owner`.
 * @example
 * ```ts
 * const owner = await requireOwner({ currentUser, owners });
 * ```
 */
export async function requireOwner(deps: {
  readonly currentUser: CurrentUserProvider;
  readonly owners: readonly string[];
}): Promise<Result<CurrentUser, NotOwner>> {
  const user = await deps.currentUser.current();
  return user && isAdmin(user, deps.owners) ? ok(user) : err('identity.not_owner');
}

/**
 * Lists every admin address: the owners, then the added admins.
 *
 * @remarks
 * Admin access and the admin emails (new receipts, bank data changes) use
 * this list, so an added admin gets them too.
 *
 * @param deps - The owners and the added admins.
 * @returns The addresses, lowercase.
 * @example
 * ```ts
 * const emails = await adminEmailList({ grants, owners });
 * ```
 */
export async function adminEmailList(
  deps: Pick<AdminTeamDeps, 'grants' | 'owners'>,
): Promise<string[]> {
  const added = (await deps.grants.listActive()).map((grant) => grant.email);
  return [...new Set([...deps.owners, ...added])];
}

/**
 * Gives an address access to the admin panel.
 *
 * @remarks
 * The caller must have checked that the signed-in user is an owner. An added
 * admin can do everything in the panel except manage admins. The new admin is
 * emailed, in Spanish like every admin email, who added them and where to sign
 * in; a failed send is reported and never undoes the grant.
 *
 * @param deps - The required ports.
 * @param input - The owner, their name, and the new admin's address.
 * @returns The grant, or why it was refused.
 * @example
 * ```ts
 * await grantAdmin(deps, { ownerId: owner.id, ownerName: owner.name, email: 'helper@example.com' });
 * ```
 */
export async function grantAdmin(
  deps: AdminTeamDeps,
  input: { readonly ownerId: string; readonly ownerName: string; readonly email: string },
): Promise<Result<AdminGrant, InvalidEmail | AlreadyAdmin>> {
  const created = createAdminGrant({
    id: deps.ids.uuid(),
    email: input.email,
    grantedBy: input.ownerId,
    grantedAt: deps.clock.now(),
  });
  if (!created.ok) return created;
  if ((await adminEmailList(deps)).includes(created.value.email)) {
    return err('identity.already_admin');
  }
  await deps.grants.add(created.value);
  await sendAfterCommit(deps, {
    template: 'admin_granted',
    to: created.value.email,
    locale: ADMIN_LOCALE,
    idempotencyKey: `admin_granted:${created.value.id}`,
    data: { grantedBy: input.ownerName, signInUrl: deps.links.signIn(ADMIN_LOCALE) },
  });
  return ok(created.value);
}

/**
 * Removes an added admin; they lose access on their next request.
 *
 * @remarks
 * The caller must have checked that the signed-in user is an owner. Owners
 * cannot be removed from the app: they live in `ADMIN_EMAILS`.
 *
 * @param deps - The required ports.
 * @param input - The owner and the grant to revoke.
 * @returns Nothing, or `identity.admin_not_found`.
 * @example
 * ```ts
 * await revokeAdmin(deps, { ownerId: owner.id, grantId });
 * ```
 */
export async function revokeAdmin(
  deps: AdminTeamDeps,
  input: { readonly ownerId: string; readonly grantId: string },
): Promise<Result<void, AdminNotFound>> {
  const revoked = await deps.grants.revoke(input.grantId, input.ownerId, deps.clock.now());
  return revoked ? ok(undefined) : err('identity.admin_not_found');
}
