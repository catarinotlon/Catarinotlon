import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EmailMessage, InMemoryEmailSender } from '@/shared/domain/email';
import { emailSender } from '@/shared/infrastructure/auth/instance';
import {
  form,
  migrateActionDatabase,
  OPEN_SETTINGS,
  redirectOf,
  requestContext,
  resetRequest,
  setSettings,
  sql,
} from '@/test/action-harness';

import {
  forgotPasswordAction,
  resendVerificationAction,
  signInAction,
  signUpAction,
} from './auth-actions';
import { PENDING_EMAIL_COOKIE } from './legal-versions';

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'turnstile-test-site-key');
  vi.stubEnv('TURNSTILE_SECRET_KEY', 'turnstile-test-secret');
});

const HUMAN_TOKEN = 'token-a-person-earned';
const server = setupServer(
  http.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', async ({ request }) => {
    const body = (await request.json()) as { secret?: string; response?: string };
    const human = body.secret === 'turnstile-test-secret' && body.response === HUMAN_TOKEN;
    return HttpResponse.json(
      human
        ? { success: true, 'error-codes': [] }
        : { success: false, 'error-codes': ['invalid-input-response'] },
    );
  }),
);

let counter = 0;
const newEmail = () => `human-${++counter}@actions.test`;

const signUpFields = (email: string, overrides: Record<string, string> = {}) => ({
  name: 'Runner Test',
  email,
  password: 'correct-horse-battery',
  phone: '5500000000',
  acceptLegal: 'on',
  distance: '3K',
  shirtSize: 'TEST-M',
  shirtName: 'Runner',
  ...overrides,
});

const usersWith = (email: string) => sql('SELECT id FROM user WHERE email = ?', [email]);

const PASSWORD = 'correct-horse-battery';
const human = (fields: Record<string, string>) =>
  form({ ...fields, 'cf-turnstile-response': HUMAN_TOKEN });
const sentTo = (template: EmailMessage['template'], to: string) =>
  (emailSender as InMemoryEmailSender).sent.filter(
    (item) => item.template === template && item.to === to,
  ).length;
const sessionCookies = () =>
  [...requestContext.cookies.keys()].filter((name) => name.includes('session'));

/** Creates a verified account, as a person would through the form. */
async function verifiedAccount(): Promise<string> {
  const email = newEmail();
  await redirectOf(() => signUpAction({}, human(signUpFields(email))));
  await sql('UPDATE user SET email_verified = 1 WHERE email = ?', [email]);
  resetRequest();
  return email;
}

describe('signUpAction with the human check on', () => {
  beforeAll(async () => {
    server.listen({ onUnhandledFrame: 'error' });
    await migrateActionDatabase();
  });
  afterAll(() => server.close());

  beforeEach(async () => {
    resetRequest();
    await setSettings(OPEN_SETTINGS);
  });

  it('refuses a sign-up that did not pass the challenge, and creates nothing', async () => {
    const email = newEmail();

    const state = await signUpAction({}, form(signUpFields(email)));

    expect(state).toEqual({ formError: 'errors.humanCheckFailed' });
    expect(await usersWith(email)).toEqual([]);
  });

  it('refuses a forged token', async () => {
    const email = newEmail();

    const state = await signUpAction(
      {},
      form(signUpFields(email, { 'cf-turnstile-response': 'forged' })),
    );

    expect(state).toEqual({ formError: 'errors.humanCheckFailed' });
    expect(await usersWith(email)).toEqual([]);
  });

  it('creates the account when a person passed the challenge', async () => {
    const email = newEmail();

    const target = await redirectOf(() =>
      signUpAction({}, form(signUpFields(email, { 'cf-turnstile-response': HUMAN_TOKEN }))),
    );

    expect(target).toBe('/es/confirma-tu-correo');
    expect(await usersWith(email)).toHaveLength(1);
  });

  it('reports field errors before the check, so the token is not spent on an invalid form', async () => {
    let checks = 0;
    server.events.on('request:start', () => void checks++);

    const state = await signUpAction(
      {},
      form(signUpFields(newEmail(), { name: '', 'cf-turnstile-response': HUMAN_TOKEN })),
    );

    server.events.removeAllListeners();
    expect(state.fieldErrors?.name).toBeDefined();
    expect(checks).toBe(0);
  });

  describe('signInAction', () => {
    it('refuses a sign-in that did not pass the challenge, even with the right password', async () => {
      const email = await verifiedAccount();

      const state = await signInAction({}, form({ email, password: PASSWORD }));

      expect(state).toEqual({ formError: 'errors.humanCheckFailed' });
      expect(sessionCookies()).toEqual([]);
    });

    it('signs in when a person passed the challenge', async () => {
      const email = await verifiedAccount();

      const target = await redirectOf(() => signInAction({}, human({ email, password: PASSWORD })));

      expect(target).toBe('/es/pago');
    });

    it('reports field errors before the check', async () => {
      const state = await signInAction({}, human({ email: 'not-an-email', password: '' }));

      expect(state.fieldErrors?.email).toBeDefined();
    });
  });

  describe('forgotPasswordAction', () => {
    it('sends no reset link without the challenge', async () => {
      const email = await verifiedAccount();

      const state = await forgotPasswordAction({}, form({ email }));

      expect(state).toEqual({ formError: 'errors.humanCheckFailed' });
      expect(sentTo('reset_password', email)).toBe(0);
    });

    it('sends the reset link when a person passed the challenge', async () => {
      const email = await verifiedAccount();

      expect(await forgotPasswordAction({}, human({ email }))).toEqual({ done: true });
      await expect.poll(() => sentTo('reset_password', email)).toBe(1);
    });
  });

  describe('resendVerificationAction', () => {
    it('sends nothing again without the challenge', async () => {
      const email = newEmail();
      await redirectOf(() => signUpAction({}, human(signUpFields(email))));
      await expect.poll(() => sentTo('verify_email', email)).toBe(1);
      // Tokens carry a one-second timestamp, and an identical token is deduplicated.
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const state = await resendVerificationAction({}, form({}));

      expect(requestContext.cookies.get(PENDING_EMAIL_COOKIE)).toBe(email);
      expect(state).toEqual({ formError: 'errors.humanCheckFailed' });
      expect(sentTo('verify_email', email)).toBe(1);
    });

    it('sends the email again when a person passed the challenge', async () => {
      const email = newEmail();
      await redirectOf(() => signUpAction({}, human(signUpFields(email))));
      await expect.poll(() => sentTo('verify_email', email)).toBe(1);
      // Tokens carry a one-second timestamp, and an identical token is deduplicated.
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(await resendVerificationAction({}, human({}))).toEqual({ done: true });
      await expect.poll(() => sentTo('verify_email', email)).toBe(2);
    });
  });
});
