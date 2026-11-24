import * as Sentry from '@sentry/nextjs';
import { describe, expect, it, vi } from 'vitest';

import { SentryErrorReporter } from './sentry-error-reporter';

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

describe('SentryErrorReporter', () => {
  it('sends the error with its context', () => {
    const error = new Error('boom');

    new SentryErrorReporter().report(error, { template: 'verify_email' });

    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      extra: { template: 'verify_email' },
    });
  });
});
