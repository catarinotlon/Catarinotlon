import { hasLocale } from 'next-intl';
import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';

import { routing, type AppLocale } from './i18n/routing';

const LOCALE_COOKIE = 'NEXT_LOCALE';

const handlerFor = (defaultLocale: AppLocale) =>
  createMiddleware({ ...routing, defaultLocale, localeDetection: false });

const handlers: Record<AppLocale, ReturnType<typeof handlerFor>> = {
  es: handlerFor('es'),
  en: handlerFor('en'),
};

/**
 * Routes a request to its locale.
 *
 * @remarks
 * The browser language is ignored: a first visit always lands on the default
 * locale. next-intl's `localeDetection` turns off the header and the cookie
 * together, so the remembered choice is read here.
 *
 * @param request - The incoming request.
 * @returns The redirect or rewrite for the request's locale.
 */
export default function proxy(request: NextRequest) {
  const remembered = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = hasLocale(routing.locales, remembered) ? remembered : routing.defaultLocale;
  return handlers[locale](request);
}

export const config = {
  matcher: '/((?!api|_next|_vercel|monitoring|ingest|.*\\..*).*)',
};
