import { err, ok, type DomainError, type Result } from '@/shared/domain/result';

/** Access to the admin panel that the owner gave to an address. */
export interface AdminGrant {
  /** The grant's UUID. */
  readonly id: string;
  /** The address that may sign in as an admin, lowercase. */
  readonly email: string;
  /** The owner who granted it. */
  readonly grantedBy: string;
  /** When it was granted. */
  readonly grantedAt: Date;
}

/** An address that cannot be an admin's. */
export type InvalidEmail = DomainError<'identity.invalid_email'>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Creates a grant, normalizing and checking the address.
 *
 * @remarks
 * Only the owners in `ADMIN_EMAILS` grant access. The grant takes effect when
 * someone signs in with that address and it is verified.
 *
 * @param input - The grant's ID, the address, the owner, and when.
 * @returns The grant, or `identity.invalid_email`.
 */
export function createAdminGrant(input: AdminGrant): Result<AdminGrant, InvalidEmail> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email)) return err('identity.invalid_email');
  return ok({ ...input, email });
}
