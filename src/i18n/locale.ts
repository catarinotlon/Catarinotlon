import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';

import { routing, type AppLocale } from './routing';

/**
 * Validates the `[locale]` route parameter.
 *
 * @param value - The raw parameter.
 * @returns The supported locale. An unsupported one renders the 404 page.
 */
export function requireLocale(value: string): AppLocale {
  if (!hasLocale(routing.locales, value)) notFound();
  return value;
}
