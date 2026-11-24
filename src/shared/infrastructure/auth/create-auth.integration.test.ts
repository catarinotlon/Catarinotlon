import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { InMemoryEmailSender, type EmailMessage } from '@/shared/domain/email';
import { InMemoryErrorReporter } from '@/shared/domain/error-reporter';

import { user } from '../db/schema';
import { createTestDatabase, type TestDatabase } from '../db/test-database';
import { createAuth, type AppAuth } from './create-auth';

const credentials = {
  name: 'Runner One',
  email: 'runner@example.test',
  password: 'correct-horse-battery',
};

type VerifyEmail = Extract<EmailMessage, { template: 'verify_email' }>;

describe('createAuth', () => {
  let database: TestDatabase;
  let emails: InMemoryEmailSender;
  let auth: AppAuth;

  const request = (locale?: string) =>
    new Headers(locale ? { cookie: `NEXT_LOCALE=${locale}` } : {});

  beforeEach(async () => {
    database = await createTestDatabase();
    emails = new InMemoryEmailSender();
    auth = createAuth({
      db: database.db,
      emails,
      reporter: new InMemoryErrorReporter(),
      secret: 'integration-test-secret-integration-test',
      baseURL: 'http://localhost:3000',
      google: { clientId: 'client-id', clientSecret: 'client-secret' },
    });
  });

  afterEach(() => {
    database.cleanup();
  });

  async function signUp(locale?: string) {
    return auth.api.signUpEmail({ body: credentials, headers: request(locale) });
  }

  async function waitForEmail(template: EmailMessage['template']) {
    await expect
      .poll(() => emails.sent.filter((item) => item.template === template).length)
      .toBe(1);
    return emails.sent.find((item) => item.template === template) as EmailMessage;
  }

  it('creates the user with a UUID', async () => {
    const { user: created } = await signUp();

    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('sends the verification email in the visitor’s locale', async () => {
    await signUp('en');

    const email = (await waitForEmail('verify_email')) as VerifyEmail;
    expect(email).toMatchObject({ to: credentials.email, locale: 'en' });
    expect(email.data.url).toContain('/api/auth/verify-email');
  });

  it('defaults the email locale to Spanish', async () => {
    await signUp();

    expect((await waitForEmail('verify_email')).locale).toBe('es');
  });

  it('refuses to sign in before the email is verified', async () => {
    await signUp();

    await expect(
      auth.api.signInEmail({
        body: { email: credentials.email, password: credentials.password },
        headers: request(),
      }),
    ).rejects.toThrow();
  });

  it('signs in once the email is verified', async () => {
    await signUp();
    await database.db
      .update(user)
      .set({ emailVerified: true })
      .where(eq(user.email, credentials.email));

    const result = await auth.api.signInEmail({
      body: { email: credentials.email, password: credentials.password },
      headers: request(),
    });

    expect(result.user.email).toBe(credentials.email);
  });

  it('sends the reset email through the port', async () => {
    await signUp();

    await auth.api.requestPasswordReset({
      body: { email: credentials.email, redirectTo: '/es/reset-password' },
      headers: request('es'),
    });

    const email = await waitForEmail('reset_password');
    expect(email.to).toBe(credentials.email);
  });

  it('does not reveal whether an email has an account', async () => {
    const result = await auth.api.requestPasswordReset({
      body: { email: 'nobody@example.test', redirectTo: '/es/reset-password' },
      headers: request('es'),
    });

    expect(result.status).toBe(true);
    expect(emails.sent.filter((item) => item.template === 'reset_password')).toEqual([]);
  });

  it('keeps self-service account deletion disabled', async () => {
    const { token } = await signUp();

    await expect(
      auth.api.deleteUser({
        body: {},
        headers: new Headers({ authorization: `Bearer ${token ?? ''}` }),
      }),
    ).rejects.toThrow();

    const rows = await database.db.select().from(user).where(eq(user.email, credentials.email));
    expect(rows).toHaveLength(1);
  });
});
