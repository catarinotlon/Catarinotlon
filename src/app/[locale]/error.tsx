'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import { LandingNav } from '@/modules/event/presentation';
import { PageShell } from '@/shared/ui/page-shell';
import { ErrorScreen } from '@/shared/ui/status-screen';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <PageShell
      width="medium"
      centered
      navigation={<LandingNav onLanding={false} />}
      actions={<></>}
    >
      <ErrorScreen onRetry={reset} />
    </PageShell>
  );
}
