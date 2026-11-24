import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const VALID = {
  SKIP_ENV_VALIDATION: '',
  TURSO_DATABASE_URL: 'file:test.db',
  BETTER_AUTH_SECRET: 'a-secret-that-is-long-enough-for-auth',
  BETTER_AUTH_URL: 'http://localhost:3000',
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
};

describe('env', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const [key, value] of Object.entries(VALID)) vi.stubEnv(key, value);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('accepts a complete environment and applies the defaults', async () => {
    const { env } = await import('./env');

    expect(env.EMAIL_TRANSPORT).toBe('resend');
    expect(env.RECEIPT_STORAGE).toBe('blob');
    expect(env.RECEIPT_MAX_BYTES).toBe(5_242_880);
  });

  it.each(['TURSO_DATABASE_URL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL', 'GOOGLE_CLIENT_ID'])(
    'fails when %s is missing',
    async (key) => {
      vi.stubEnv(key, '');

      await expect(import('./env')).rejects.toThrow();
    },
  );

  it('rejects an auth secret that is too short', async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', 'short');

    await expect(import('./env')).rejects.toThrow();
  });

  it('rejects a short cron secret', async () => {
    vi.stubEnv('CRON_SECRET', 'short');

    await expect(import('./env')).rejects.toThrow();
  });
});
