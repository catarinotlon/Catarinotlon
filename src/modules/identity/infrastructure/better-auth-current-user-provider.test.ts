import { describe, expect, it } from 'vitest';

import { BetterAuthCurrentUserProvider } from './better-auth-current-user-provider';

const requestHeaders = new Headers({ cookie: 'session=abc' });

describe('BetterAuthCurrentUserProvider', () => {
  it('maps the session user', async () => {
    const provider = new BetterAuthCurrentUserProvider(
      async ({ headers }) =>
        headers === requestHeaders
          ? {
              user: {
                id: 'user-1',
                name: 'Runner',
                email: 'runner@example.test',
                emailVerified: true,
                image: 'ignored',
              },
            }
          : null,
      async () => requestHeaders,
    );

    expect(await provider.current()).toEqual({
      id: 'user-1',
      name: 'Runner',
      email: 'runner@example.test',
      emailVerified: true,
    });
  });

  it('returns null for a signed-out visitor', async () => {
    const provider = new BetterAuthCurrentUserProvider(
      async () => null,
      async () => requestHeaders,
    );

    expect(await provider.current()).toBeNull();
  });
});
