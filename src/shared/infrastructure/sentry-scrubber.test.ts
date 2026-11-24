import { describe, expect, it } from 'vitest';

import { scrubSentryEvent } from './sentry-scrubber';

describe('scrubSentryEvent', () => {
  it('removes the user', () => {
    const event = scrubSentryEvent({ user: { email: 'runner@example.test', id: '1' } });

    expect(event.user).toBeUndefined();
  });

  it('removes cookies, headers, and bodies from the request', () => {
    const event = scrubSentryEvent({
      request: {
        url: 'https://app.test/es/account',
        cookies: { session: 'secret' },
        headers: { authorization: 'Bearer secret' },
        data: { password: 'secret' },
        query_string: 'token=secret',
      },
    });

    expect(event.request).toEqual({ url: 'https://app.test/es/account' });
  });

  it('drops the query string from the URL, where tokens travel', () => {
    const event = scrubSentryEvent({
      request: { url: 'https://app.test/es/reset-password?token=secret' },
    });

    expect(event.request?.url).toBe('https://app.test/es/reset-password');
  });

  it('redacts email addresses in the message', () => {
    const event = scrubSentryEvent({ message: 'Failed for runner@example.test today' });

    expect(event.message).toBe('Failed for [email] today');
  });

  it('redacts email addresses in exception values', () => {
    const event = scrubSentryEvent({
      exception: { values: [{ type: 'Error', value: 'Bad address runner@example.test' }] },
    });

    expect(event.exception?.values?.[0]?.value).toBe('Bad address [email]');
  });

  it('redacts CLABE-like numbers and phone numbers', () => {
    const event = scrubSentryEvent({ message: 'CLABE 002010077777777771 phone 5512345678' });

    expect(event.message).toBe('CLABE [number] phone [number]');
  });

  it('removes breadcrumbs, which can capture typed values', () => {
    const event = scrubSentryEvent({ breadcrumbs: [{ message: 'typed runner@example.test' }] });

    expect(event.breadcrumbs).toBeUndefined();
  });

  it('keeps the non-personal operation context', () => {
    const event = scrubSentryEvent({
      extra: { operation: 'email.send', template: 'verify_email' },
    });

    expect(event.extra).toEqual({ operation: 'email.send', template: 'verify_email' });
  });
});
