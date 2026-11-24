/**
 * Builds the initials shown on the account avatar.
 *
 * @param name - The account holder's full name.
 * @returns The first letters of the first two names, uppercase.
 *
 * @example
 * ```ts
 * initials('Sofía Ramírez'); // 'SR'
 * ```
 */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? '')
    .join('')
    .toLocaleUpperCase();
}
