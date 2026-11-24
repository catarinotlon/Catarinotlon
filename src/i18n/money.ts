import { createFormatter, type Locale } from 'next-intl';

const MEXICAN_FORMAT: Readonly<Record<string, string>> = { es: 'es-MX', en: 'en-MX' };

/**
 * Formats an amount in Mexican pesos.
 *
 * @remarks
 * The app's `es` locale alone would use Spain's number format, so amounts are
 * formatted with the Mexican regional variant of each language.
 *
 * @param cents - The amount, in cents.
 * @param locale - The app locale.
 * @returns The formatted amount, such as `$123.45`.
 *
 * @example
 * ```ts
 * formatMoney(12345, 'es'); // '$123.45'
 * ```
 */
export function formatMoney(cents: number, locale: string): string {
  const format = createFormatter({
    locale: (MEXICAN_FORMAT[locale] ?? 'es-MX') as Locale,
    timeZone: 'America/Mexico_City',
  });
  return format.number(cents / 100, {
    style: 'currency',
    currency: 'MXN',
    currencyDisplay: 'narrowSymbol',
  });
}
