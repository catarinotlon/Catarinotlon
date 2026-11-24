import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { InMemoryEmailSender } from '@/shared/domain/email';
import { InMemoryErrorReporter } from '@/shared/domain/error-reporter';
import { createAuth } from '@/shared/infrastructure/auth/create-auth';
import { user } from '@/shared/infrastructure/db/schema';
import { createTestDatabase, type TestDatabase } from '@/shared/infrastructure/db/test-database';

import { BetterAuthAccounts } from './better-auth-accounts';

const credentials = {
  name: 'Runner One',
  email: 'runner@example.test',
  password: 'correct-horse-battery',
};

describe('BetterAuthAccounts', () => {
  let database: TestDatabase;
  let accounts: BetterAuthAccounts;
  const headers = new Headers();

  beforeEach(async () => {
    database = await createTestDatabase();
    const auth = createAuth({
      db: database.db,
      emails: new InMemoryEmailSender(),
      reporter: new InMemoryErrorReporter(),
      secret: 'integration-test-secret-integration-test',
      baseURL: 'http://localhost:3000',
      google: { clientId: 'client-id', clientSecret: 'client-secret' },
    });
    accounts = new BetterAuthAccounts(auth, async () => headers);
  });

  afterEach(() => {
    database.cleanup();
  });

  const verify = () =>
    database.db.update(user).set({ emailVerified: true }).where(eq(user.email, credentials.email));

  it('returns the new user’s id on sign-up', async () => {
    const result = await accounts.signUp(credentials);

    expect(result.userId).toEqual(expect.any(String));
  });

  it('does not reveal an existing email and creates nothing for it', async () => {
    await accounts.signUp(credentials);

    const second = await accounts.signUp(credentials);

    expect(second).toEqual({ userId: null });
    expect(await database.db.select().from(user)).toHaveLength(1);
  });

  it('signs in with verified credentials', async () => {
    await accounts.signUp(credentials);
    await verify();

    const { userId } = await accounts.signUp({ ...credentials, email: 'second@example.test' });
    await database.db
      .update(user)
      .set({ emailVerified: true })
      .where(eq(user.email, 'second@example.test'));

    expect((await accounts.signIn(credentials)).ok).toBe(true);
    expect(await accounts.signIn({ ...credentials, email: 'second@example.test' })).toEqual({
      ok: true,
      value: { userId },
    });
  });

  it('reports wrong credentials', async () => {
    await accounts.signUp(credentials);
    await verify();

    expect(await accounts.signIn({ ...credentials, password: 'wrong-password' })).toEqual({
      ok: false,
      error: { code: 'identity.invalid_credentials' },
    });
  });

  it('reports an unknown email the same way as a wrong password', async () => {
    expect(await accounts.signIn({ ...credentials, email: 'nobody@example.test' })).toEqual({
      ok: false,
      error: { code: 'identity.invalid_credentials' },
    });
  });

  it('reports an unverified email', async () => {
    await accounts.signUp(credentials);

    expect(await accounts.signIn(credentials)).toEqual({
      ok: false,
      error: { code: 'identity.email_not_verified' },
    });
  });

  it('reports an invalid reset link', async () => {
    expect(await accounts.resetPassword({ token: 'bad-token', password: 'new-password' })).toEqual({
      ok: false,
      error: { code: 'identity.invalid_reset_link' },
    });
  });

  describe('account details', () => {
    it('reports a password account', async () => {
      const { userId } = await accounts.signUp(credentials);

      expect(await accounts.signInMethod(userId ?? '')).toBe('password');
    });

    it('reports an account with no password as Google', async () => {
      expect(await accounts.signInMethod('no-credential')).toBe('google');
    });
  });

  describe('verify', () => {
    it('accepts the correct password', async () => {
      const { userId } = await accounts.signUp(credentials);

      expect(await accounts.verify(userId ?? '', credentials.password)).toBe(true);
    });

    it('refuses a wrong password', async () => {
      const { userId } = await accounts.signUp(credentials);

      expect(await accounts.verify(userId ?? '', 'wrong-password')).toBe(false);
    });

    it('refuses an account with no password', async () => {
      expect(await accounts.verify('missing', 'anything')).toBe(false);
    });
  });
});
