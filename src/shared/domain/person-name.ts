/**
 * Takes the first name of a full name, for greetings.
 *
 * @param name - The full name.
 * @returns Its first word.
 *
 * @example
 * ```ts
 * firstName('Sofía Ramírez'); // 'Sofía'
 * ```
 */
export function firstName(name: string): string {
  return name.trim().split(/\s+/u)[0] ?? '';
}
