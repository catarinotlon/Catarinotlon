import { scrubSentryEvent, type ScrubbableEvent } from './sentry-scrubber';

/**
 * Builds the Sentry options shared by the server and the browser.
 *
 * @remarks
 * Since Sentry 11 the SDK collects cookies, headers, bodies, and query data by
 * default. Runner data must never reach Sentry, so every category is turned off
 * here, and each event is scrubbed again before it is sent.
 *
 * @param dsn - The project's DSN. Without one, Sentry stays disabled.
 * @returns The options for `Sentry.init`.
 *
 * @example
 * ```ts
 * Sentry.init(sentryOptions(process.env.NEXT_PUBLIC_SENTRY_DSN));
 * ```
 */
export function sentryOptions(dsn: string | undefined) {
  return {
    ...(dsn ? { dsn } : {}),
    enabled: Boolean(dsn),
    tracesSampleRate: 0,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    },
    /** Scrubs each event before it leaves the app. */
    beforeSend: <T extends ScrubbableEvent>(event: T): T => scrubSentryEvent(event),
  };
}
