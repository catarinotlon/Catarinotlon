'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

const COPY = {
  es: { title: 'Algo salió mal', body: 'No pudimos cargar esta página.', retry: 'Reintentar' },
  en: { title: 'Something went wrong', body: "We couldn't load this page.", retry: 'Try again' },
} as const;

/**
 * Last-resort error page, shown when the root layout itself fails.
 *
 * @remarks
 * The message provider is unavailable here, so this is the one place with inline
 * copy, and it uses plain styles because the app's CSS may not have loaded.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const locale =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/en') ? 'en' : 'es';
  const copy = COPY[locale];

  return (
    <html lang={locale}>
      <body style={{ fontFamily: 'Arial, sans-serif', textAlign: 'center', padding: '4rem 1rem' }}>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
        <button type="button" onClick={reset} style={{ minHeight: 44, padding: '0 1.25rem' }}>
          {copy.retry}
        </button>
      </body>
    </html>
  );
}
