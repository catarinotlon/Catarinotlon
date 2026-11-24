import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';

import { posthogOptions } from '@/shared/infrastructure/posthog-options';
import { sentryOptions } from '@/shared/infrastructure/sentry-options';

Sentry.init(sentryOptions(process.env.NEXT_PUBLIC_SENTRY_DSN));

const analytics = posthogOptions(process.env.NEXT_PUBLIC_POSTHOG_KEY);
if (analytics) posthog.init(analytics.key, analytics.config);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
