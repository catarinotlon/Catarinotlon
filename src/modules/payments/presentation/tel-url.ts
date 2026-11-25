/**
 * Builds the link that calls a phone number. The site turns off the browser's own phone
 * detection, so a number is only tappable where this link is used.
 *
 * @param number - The phone number, in any format.
 * @returns The `tel:` link, with only the digits and a leading plus.
 *
 * @example
 * ```ts
 * telUrl('+52 (55) 1234-5678'); // 'tel:+525512345678'
 * ```
 */
export function telUrl(number: string): string {
  const trimmed = number.trim();
  const prefix = trimmed.startsWith('+') ? '+' : '';
  return `tel:${prefix}${trimmed.replace(/\D/g, '')}`;
}
