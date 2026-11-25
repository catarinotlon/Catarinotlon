import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getSignedInUser } from '@/composition';
import type { EmailMessage, InMemoryEmailSender } from '@/shared/domain/email';
import { emailSender } from '@/shared/infrastructure/auth/instance';
import {
  CLOSED_SETTINGS,
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
  resetPasswordAction,
  saveAccountAction,
  signInAction,
  signOutAction,
  signUpAction,
} from './auth-actions';
import { PENDING_EMAIL_COOKIE } from './legal-versions';

const PASSWORD = 'correct-horse-battery';
const outbox = () => (emailSender as InMemoryEmailSender).sent;
let counter = 0;
const newEmail = () => `runner-${++counter}@actions.test`;

const signUpFields = (email: string, overrides: Record<string, string> = {}) => ({
  name: 'Runner Test',
  email,
  password: PASSWORD,
  phone: '5500000000',
  acceptLegal: 'on',
  distance: '3K',
  shirtSize: 'TEST-M',
  shirtName: 'Runner',
  ...overrides,
});

const verify = (email: string) =>
  sql('UPDATE user SET email_verified = 1 WHERE email = ?', [email]);

const registrationsOf = (email: string) =>
  sql(
    `SELECT r.runner_name, r.status, r.distance, r.shirt_size, r.shirt_name, r.fee_cents, r.locale
     FROM registrations r JOIN user u ON u.id = r.owner_id WHERE u.email = ?`,
    [email],
  );

async function waitForEmail(template: EmailMessage['template'], to: string) {
  await expect
    .poll(() => outbox().filter((item) => item.template === template && item.to === to).length)
    .toBeGreaterThan(0);
  return outbox()
    .filter((item) => item.template === template && item.to === to)
    .at(-1)!;
}

describe('auth server actions', () => {
  beforeAll(migrateActionDatabase);

  beforeEach(async () => {
    resetRequest();
    await setSettings(OPEN_SETTINGS);
  });

  describe('signUpAction', () => {
    it('creates the account and a pending registration, then asks to confirm the email', async () => {
      const email = newEmail();

      const target = await redirectOf(() => signUpAction({}, form(signUpFields(email))));

      expect(target).toBe('/es/confirma-tu-correo');
      expect(await registrationsOf(email)).toEqual([
        {
          runner_name: 'Runner Test',
          status: 'pending_payment',
          distance: '3K',
          shirt_size: 'TEST-M',
          shirt_name: 'Runner',
          fee_cents: 10000,
          locale: 'es',
        },
      ]);
    });

    it('stores the phone and which legal versions were accepted', async () => {
      const email = newEmail();

      await redirectOf(() => signUpAction({}, form(signUpFields(email))));

      expect(
        await sql(
          `SELECT p.phone, a.privacy_version, a.terms_version FROM user u
           JOIN account_profiles p ON p.user_id = u.id
           JOIN legal_acceptances a ON a.user_id = u.id WHERE u.email = ?`,
          [email],
        ),
      ).toEqual([
        {
          phone: '5500000000',
          privacy_version: 'privacy-2026-11-24-3',
          terms_version: 'terms-2026-11-24',
        },
      ]);
    });

    it('remembers the address only in the cookie, never in the URL', async () => {
      const email = newEmail();

      const target = await redirectOf(() => signUpAction({}, form(signUpFields(email))));

      expect(target).not.toContain(email);
      expect(requestContext.cookies.get(PENDING_EMAIL_COOKIE)).toBe(email);
    });

    it('registers in the visitor’s locale', async () => {
      const email = newEmail();
      requestContext.locale = 'en';

      const target = await redirectOf(() => signUpAction({}, form(signUpFields(email))));

      expect(target).toBe('/en/verify-email');
      expect((await registrationsOf(email))[0]?.locale).toBe('en');
    });

    it('creates only the account while registration is closed', async () => {
      await setSettings(CLOSED_SETTINGS);
      const email = newEmail();
      const { distance: _d, shirtSize: _s, shirtName: _n, ...account } = signUpFields(email);

      await redirectOf(() => signUpAction({}, form(account)));

      expect(await sql('SELECT id FROM user WHERE email = ?', [email])).toHaveLength(1);
      expect(await registrationsOf(email)).toEqual([]);
    });

    it('reports account and race errors together and creates nothing', async () => {
      const email = newEmail();

      const state = await signUpAction(
        {},
        form(signUpFields(email, { password: 'short', shirtName: ' ', acceptLegal: '' })),
      );

      expect(state.fieldErrors).toMatchObject({
        password: 'errors.passwordTooShort',
        shirtName: 'errors.registration.shirt_name_required',
        acceptLegal: 'errors.acceptLegal',
      });
      expect(await sql('SELECT id FROM user WHERE email = ?', [email])).toEqual([]);
    });

    it('refuses a size that is not on offer before creating the account', async () => {
      const email = newEmail();

      const state = await signUpAction({}, form(signUpFields(email, { shirtSize: 'TEST-Z' })));

      expect(state.fieldErrors).toEqual({ shirtSize: 'errors.registration.invalid_shirt_size' });
      expect(await sql('SELECT id FROM user WHERE email = ?', [email])).toEqual([]);
    });

    it('answers the same for an existing email and adds no registration', async () => {
      const email = newEmail();
      await redirectOf(() => signUpAction({}, form(signUpFields(email))));

      const target = await redirectOf(() => signUpAction({}, form(signUpFields(email))));

      expect(target).toBe('/es/confirma-tu-correo');
      expect(await registrationsOf(email)).toHaveLength(1);
    });
  });

  describe('signInAction', () => {
    async function registered(fields: Record<string, string> = {}) {
      const email = newEmail();
      await redirectOf(() => signUpAction({}, form(signUpFields(email, fields))));
      await verify(email);
      resetRequest();
      return email;
    }

    it('reports an unverified email', async () => {
      const email = newEmail();
      await redirectOf(() => signUpAction({}, form(signUpFields(email))));
      resetRequest();

      expect(await signInAction({}, form({ email, password: PASSWORD }))).toEqual({
        formError: 'errors.emailNotVerified',
      });
    });

    it('reports wrong credentials', async () => {
      const email = await registered();

      expect(await signInAction({}, form({ email, password: 'wrong-password' }))).toEqual({
        formError: 'errors.invalidCredentials',
      });
    });

    it('reports a malformed form per field', async () => {
      const state = await signInAction({}, form({ email: 'nope', password: '' }));

      expect(state.fieldErrors).toEqual({
        email: 'errors.invalidEmail',
        password: 'errors.required',
      });
    });

    it('opens a session and continues to payment for an unpaid runner', async () => {
      const email = await registered();

      const target = await redirectOf(() => signInAction({}, form({ email, password: PASSWORD })));

      expect(target).toBe('/es/pago');
      const user = await getSignedInUser();
      expect(user.ok && user.value.email).toBe(email);
    });

    it('continues to registration for an account with no runner', async () => {
      await setSettings(CLOSED_SETTINGS);
      const email = newEmail();
      await redirectOf(() => signUpAction({}, form(signUpFields(email))));
      await verify(email);
      resetRequest();
      await setSettings(OPEN_SETTINGS);

      const target = await redirectOf(() => signInAction({}, form({ email, password: PASSWORD })));

      expect(target).toBe('/es/inscripcion');
    });

    it('continues to the account when nothing is unpaid', async () => {
      const email = await registered();
      await sql(
        `UPDATE registrations SET status = 'confirmed'
         WHERE owner_id = (SELECT id FROM user WHERE email = ?)`,
        [email],
      );

      const target = await redirectOf(() => signInAction({}, form({ email, password: PASSWORD })));

      expect(target).toBe('/es/cuenta');
    });
  });

  describe('signOutAction', () => {
    it('ends the session and returns home', async () => {
      const email = newEmail();
      await redirectOf(() => signUpAction({}, form(signUpFields(email))));
      await verify(email);
      resetRequest();
      await redirectOf(() => signInAction({}, form({ email, password: PASSWORD })));

      const target = await redirectOf(() => signOutAction());

      expect(target).toBe('/es');
      expect((await getSignedInUser()).ok).toBe(false);
    });
  });

  describe('saveAccountAction', () => {
    async function signedIn() {
      const email = newEmail();
      await redirectOf(() => signUpAction({}, form(signUpFields(email))));
      await verify(email);
      resetRequest();
      await redirectOf(() => signInAction({}, form({ email, password: PASSWORD })));
      return email;
    }

    it('saves the name and the phone', async () => {
      const email = await signedIn();

      const state = await saveAccountAction({}, form({ name: ' Nuevo Nombre ', phone: '5599' }));

      expect(state).toEqual({ done: true });
      expect(
        await sql(
          `SELECT u.name, p.phone FROM user u JOIN account_profiles p ON p.user_id = u.id
           WHERE u.email = ?`,
          [email],
        ),
      ).toEqual([{ name: 'Nuevo Nombre', phone: '5599' }]);
      expect(requestContext.revalidated).toContain('/[locale]/account:page');
    });

    it('requires both fields', async () => {
      await signedIn();

      expect((await saveAccountAction({}, form({ name: ' ', phone: ' ' }))).fieldErrors).toEqual({
        name: 'errors.required',
        phone: 'errors.required',
      });
    });

    it('refuses a signed-out visitor', async () => {
      expect(await saveAccountAction({}, form({ name: 'X', phone: '1' }))).toEqual({
        formError: 'errors.generic',
      });
    });
  });

  describe('password reset', () => {
    it('answers the same for an unknown email and sends nothing', async () => {
      const email = newEmail();

      expect(await forgotPasswordAction({}, form({ email }))).toEqual({ done: true });
      expect(outbox().filter((item) => item.to === email)).toEqual([]);
    });

    it('reports a malformed email', async () => {
      expect((await forgotPasswordAction({}, form({ email: 'nope' }))).fieldErrors).toEqual({
        email: 'errors.invalidEmail',
      });
    });

    it('resets with the emailed token, and the new password works', async () => {
      const email = newEmail();
      await redirectOf(() => signUpAction({}, form(signUpFields(email))));
      await verify(email);
      resetRequest();

      await forgotPasswordAction({}, form({ email }));
      const message = await waitForEmail('reset_password', email);
      const url = new URL((message.data as { url: string }).url);
      const token = url.pathname.split('/').at(-1) ?? '';
      const newPassword = 'another-long-password';

      const target = await redirectOf(() =>
        resetPasswordAction({}, form({ token, password: newPassword, confirm: newPassword })),
      );

      expect(target).toBe('/es/iniciar-sesion');
      await redirectOf(() => signInAction({}, form({ email, password: newPassword })));
    });

    it('reports an invalid link', async () => {
      const state = await resetPasswordAction(
        {},
        form({ token: 'invalid', password: PASSWORD, confirm: PASSWORD }),
      );

      expect(state).toEqual({ formError: 'errors.invalidResetLink' });
    });

    it('reports passwords that do not match', async () => {
      const state = await resetPasswordAction(
        {},
        form({ token: 'token', password: PASSWORD, confirm: 'different-password' }),
      );

      expect(state.fieldErrors).toEqual({ confirm: 'errors.passwordsDontMatch' });
    });
  });

  describe('resendVerificationAction', () => {
    it('sends another link to the address that just signed up', async () => {
      const email = newEmail();
      await redirectOf(() => signUpAction({}, form(signUpFields(email))));
      await waitForEmail('verify_email', email);
      const before = outbox().filter((item) => item.to === email).length;
      // Tokens carry a one-second timestamp, and an identical token is deduplicated.
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(await resendVerificationAction({}, form({}))).toEqual({ done: true });

      await expect
        .poll(() => outbox().filter((item) => item.to === email).length)
        .toBeGreaterThan(before);
    });

    it('sends nothing when no address is pending', async () => {
      const before = outbox().length;

      expect(await resendVerificationAction({}, form({}))).toEqual({ done: true });

      expect(outbox()).toHaveLength(before);
    });
  });
});
