const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const LONG_NUMBER = /\b\d{10,18}\b/g;

/** The parts of a Sentry event that can carry personal data. */
export interface ScrubbableEvent {
  /** The affected user. */
  user?: unknown;
  /** The event message. */
  message?: string;
  /** The HTTP request. */
  request?: {
    url?: string;
    cookies?: unknown;
    headers?: unknown;
    data?: unknown;
    query_string?: unknown;
  };
  /** The captured exceptions. */
  exception?: { values?: { type?: string; value?: string }[] };
  /** The trail of events before the error. */
  breadcrumbs?: unknown[];
  /** Extra non-personal context. */
  extra?: Record<string, unknown>;
}

const redact = (text: string): string =>
  text.replace(EMAIL, '[email]').replace(LONG_NUMBER, '[number]');

/**
 * Removes personal data from a Sentry event before it leaves the app.
 *
 * @remarks
 * Runner data, passwords, session cookies, and reset tokens must never reach
 * Sentry. The event keeps only what is needed to diagnose the error.
 *
 * @param event - The event.
 * @returns The scrubbed event.
 *
 * @example
 * ```ts
 * Sentry.init({ sendDefaultPii: false, beforeSend: scrubSentryEvent });
 * ```
 */
export function scrubSentryEvent<T extends ScrubbableEvent>(event: T): T {
  const scrubbed: T = { ...event };
  delete scrubbed.user;
  delete scrubbed.breadcrumbs;

  if (scrubbed.message) scrubbed.message = redact(scrubbed.message);

  if (event.request) {
    const url = event.request.url?.split('?')[0];
    scrubbed.request = url ? { url } : {};
  }

  if (event.exception?.values) {
    scrubbed.exception = {
      values: event.exception.values.map((item) =>
        item.value ? { ...item, value: redact(item.value) } : item,
      ),
    };
  }

  return scrubbed;
}
