const normalize = (email: string): string => email.trim().toLowerCase();

/**
 * Parses the `ADMIN_EMAILS` allowlist.
 *
 * @param value - A comma-separated list of addresses.
 * @returns The normalized addresses.
 *
 * @example
 * ```ts
 * parseAdminEmails('A@example.test, b@example.test');
 * // ['a@example.test', 'b@example.test']
 * ```
 */
export function parseAdminEmails(value: string): string[] {
  return value.split(',').map(normalize).filter(Boolean);
}

/**
 * Decides whether a user is an admin.
 *
 * @remarks
 * A user is an admin only while their address is on the allowlist and verified.
 * The role is derived on every request and never stored.
 *
 * @param user - The user's email and verification state.
 * @param allowlist - The normalized admin addresses.
 * @returns `true` when the user is an admin.
 */
export function isAdmin(
  user: { readonly email: string; readonly emailVerified: boolean },
  allowlist: readonly string[],
): boolean {
  return user.emailVerified && allowlist.includes(normalize(user.email));
}
