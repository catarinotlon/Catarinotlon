import { describe, expect, it } from 'vitest';

import { readDatabaseEnv } from './database-env';

describe('readDatabaseEnv', () => {
  it('defaults to the local file', () => {
    expect(readDatabaseEnv({})).toEqual({ url: 'file:local.db' });
  });

  it('reads a remote database with its token', () => {
    expect(
      readDatabaseEnv({
        TURSO_DATABASE_URL: 'libsql://db.example.test',
        TURSO_AUTH_TOKEN: 'token',
      }),
    ).toEqual({ url: 'libsql://db.example.test', authToken: 'token' });
  });

  it('rejects an empty URL', () => {
    expect(() => readDatabaseEnv({ TURSO_DATABASE_URL: '' })).toThrow();
  });
});
