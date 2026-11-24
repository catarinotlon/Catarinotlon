import { describe, expect, it } from 'vitest';

import { isAuthorizedCronRequest } from './cron-auth';

const SECRET = 'a-long-random-cron-secret';
const request = (authorization?: string) =>
  new Request('https://app.test/api/cron/race-reminders', {
    headers: authorization ? { authorization } : {},
  });

describe('isAuthorizedCronRequest', () => {
  it('accepts the configured bearer secret', () => {
    expect(isAuthorizedCronRequest(request(`Bearer ${SECRET}`), SECRET)).toBe(true);
  });

  it('refuses a wrong secret', () => {
    expect(isAuthorizedCronRequest(request('Bearer wrong-secret-of-other-size'), SECRET)).toBe(
      false,
    );
  });

  it('refuses a wrong secret of the same length', () => {
    const sameLength = 'x'.repeat(SECRET.length);

    expect(isAuthorizedCronRequest(request(`Bearer ${sameLength}`), SECRET)).toBe(false);
  });

  it('refuses a request with no header', () => {
    expect(isAuthorizedCronRequest(request(), SECRET)).toBe(false);
  });

  it('refuses everything while no secret is configured', () => {
    expect(isAuthorizedCronRequest(request('Bearer '), undefined)).toBe(false);
    expect(isAuthorizedCronRequest(request('Bearer undefined'), undefined)).toBe(false);
  });
});
