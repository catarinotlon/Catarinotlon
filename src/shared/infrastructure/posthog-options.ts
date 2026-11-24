import type { PostHogConfig } from 'posthog-js';

/** The site's own path that forwards analytics to PostHog (see `next.config.ts`). */
export const POSTHOG_PROXY_PATH = '/ingest';

/** What {@link posthogOptions} returns when analytics is on. */
export interface PostHogSetup {
  /** The project key, which is public by design. */
  readonly key: string;
  /** The options for `posthog.init`. */
  readonly config: Partial<PostHogConfig>;
}

/**
 * Builds the PostHog options for product analytics and session replay.
 *
 * @remarks
 * Privacy first, as with Sentry: recordings mask every input and any text
 * inside an element marked `data-private`; elements with the `ph-no-capture`
 * class (the ticket QR, receipts, the scanner camera) are not recorded at
 * all. Click events keep no element text or attributes. Nobody is identified,
 * so PostHog never receives a name or an email, and Do Not Track is honoured.
 *
 * @param key - The project key. Without one, analytics stays off.
 * @returns The key and options, or `null` when analytics is off.
 * @example
 * const setup = posthogOptions(process.env.NEXT_PUBLIC_POSTHOG_KEY);
 * if (setup) posthog.init(setup.key, setup.config);
 */
export function posthogOptions(key: string | undefined): PostHogSetup | null {
  if (!key) return null;
  return {
    key,
    config: {
      api_host: POSTHOG_PROXY_PATH,
      ui_host: 'https://us.posthog.com',
      capture_pageview: 'history_change',
      capture_pageleave: true,
      person_profiles: 'identified_only',
      respect_dnt: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-private], [data-private] *',
      },
    },
  };
}
