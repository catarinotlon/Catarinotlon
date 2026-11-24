import * as Sentry from '@sentry/nextjs';

import { sentryOptions } from '@/shared/infrastructure/sentry-options';

Sentry.init(sentryOptions(process.env.NEXT_PUBLIC_SENTRY_DSN));

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
