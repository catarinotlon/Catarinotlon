import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

import * as schema from './schema';

/** A migrated, throwaway database for integration tests. */
export interface TestDatabase {
  /** The Drizzle client. */
  readonly db: LibSQLDatabase<typeof schema>;
  /** The raw libSQL client, for statements the ORM must not offer. */
  readonly client: Client;
  /** Closes the connection and removes the temporary directory. */
  cleanup(): void;
}

/**
 * Creates a database in a new temporary directory and applies all migrations.
 *
 * @returns The test database.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const directory = mkdtempSync(join(tmpdir(), 'catarinotlon-test-'));
  const client = createClient({ url: `file:${join(directory, 'test.db')}` });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: 'drizzle' });

  return {
    db,
    client,
    cleanup() {
      client.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}
