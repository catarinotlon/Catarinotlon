import * as Sentry from '@sentry/nextjs';

import type { ErrorReporter } from '@/shared/domain/error-reporter';

/** {@link ErrorReporter} adapter backed by Sentry. */
export class SentryErrorReporter implements ErrorReporter {
  report(error: unknown, context: Readonly<Record<string, string>>): void {
    Sentry.captureException(error, { extra: { ...context } });
  }
}
