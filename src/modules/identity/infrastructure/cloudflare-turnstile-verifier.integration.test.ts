import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { CloudflareTurnstileVerifier } from './cloudflare-turnstile-verifier';
import { describeHumanVerifierContract } from './human-verifier.contract';

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const SECRET = 'turnstile-test-secret';

const server = setupServer();

/** Answers like Cloudflare's siteverify, for tokens this fake issued. */
function fakeSiteverify() {
  const issued = new Set<string>();
  const spent = new Set<string>();
  const failure = (code: string) => HttpResponse.json({ success: false, 'error-codes': [code] });
  server.use(
    http.post(SITEVERIFY, async ({ request }) => {
      const body = (await request.json()) as { secret?: string; response?: string };
      if (body.secret !== SECRET) return failure('invalid-input-secret');
      if (!body.response) return failure('missing-input-response');
      if (!issued.has(body.response) || spent.has(body.response)) {
        return failure('timeout-or-duplicate');
      }
      spent.add(body.response);
      return HttpResponse.json({ success: true, 'error-codes': [], hostname: 'localhost' });
    }),
  );
  return {
    issue: () => {
      const token = `cf-token-${issued.size + 1}`;
      issued.add(token);
      return token;
    },
  };
}

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describeHumanVerifierContract('Cloudflare Turnstile', () => {
  const cloudflare = fakeSiteverify();
  return {
    verifier: new CloudflareTurnstileVerifier({ secretKey: SECRET }),
    humanToken: cloudflare.issue,
    cleanup: () => undefined,
  };
});

describe('CloudflareTurnstileVerifier', () => {
  it('does not ask Cloudflare when the form sent no token', async () => {
    let asked = false;
    server.use(
      http.post(SITEVERIFY, () => {
        asked = true;
        return HttpResponse.json({ success: false, 'error-codes': ['missing-input-response'] });
      }),
    );

    expect(await new CloudflareTurnstileVerifier({ secretKey: SECRET }).verify(null)).toBe(false);
    expect(asked).toBe(false);
  });

  it('throws when the secret key is wrong, instead of blaming the visitor', async () => {
    const cloudflare = fakeSiteverify();

    await expect(
      new CloudflareTurnstileVerifier({ secretKey: 'wrong-secret' }).verify(cloudflare.issue()),
    ).rejects.toThrow(/invalid-input-secret/);
  });

  it('throws when Cloudflare cannot answer', async () => {
    server.use(http.post(SITEVERIFY, () => new HttpResponse(null, { status: 503 })));

    await expect(
      new CloudflareTurnstileVerifier({ secretKey: SECRET }).verify('cf-token'),
    ).rejects.toThrow(/503/);
  });
});
