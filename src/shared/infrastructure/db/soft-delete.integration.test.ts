import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestDatabase, type TestDatabase } from './test-database';

const EXEMPT_TABLES = ['session', 'verification'];

describe('soft delete enforcement', () => {
  let database: TestDatabase;

  async function tableNames(): Promise<string[]> {
    const result = await database.client.execute(
      `SELECT name FROM sqlite_master
       WHERE type = 'table'
         AND name NOT LIKE 'sqlite_%'
         AND name NOT LIKE '__drizzle%'
         AND name NOT LIKE 'libsql_%'`,
    );
    return result.rows.map((row) => String(row.name));
  }

  beforeAll(async () => {
    database = await createTestDatabase();
  });

  afterAll(() => {
    database.cleanup();
  });

  it('finds the domain tables', async () => {
    expect(await tableNames()).toEqual(
      expect.arrayContaining(['registrations', 'payments', 'user']),
    );
  });

  it('has a BEFORE DELETE trigger on every table that is not exempt', async () => {
    const triggers = await database.client.execute(
      `SELECT tbl_name, sql FROM sqlite_master WHERE type = 'trigger'`,
    );
    const guarded = new Set(
      triggers.rows
        .filter((row) => /BEFORE\s+DELETE/i.test(String(row.sql)))
        .map((row) => String(row.tbl_name)),
    );

    const unguarded = (await tableNames()).filter(
      (name) => !guarded.has(name) && !EXEMPT_TABLES.includes(name),
    );

    expect(unguarded).toEqual([]);
  });

  it('has soft-delete columns on every table that is not exempt', async () => {
    const missing: string[] = [];
    for (const name of await tableNames()) {
      if (EXEMPT_TABLES.includes(name)) continue;
      const columns = await database.client.execute(`PRAGMA table_info("${name}")`);
      const columnNames = columns.rows.map((row) => String(row.name));
      if (!columnNames.includes('deleted_at') || !columnNames.includes('deleted_by')) {
        missing.push(name);
      }
    }

    expect(missing).toEqual([]);
  });

  it('aborts a hard delete issued as raw SQL', async () => {
    await database.client.execute(
      `INSERT INTO user (id, name, email) VALUES ('user-hard-delete', 'Name', 'hard@example.test')`,
    );

    await expect(
      database.client.execute(`DELETE FROM user WHERE id = 'user-hard-delete'`),
    ).rejects.toThrow(/soft delete/i);

    const remaining = await database.client.execute(
      `SELECT id FROM user WHERE id = 'user-hard-delete'`,
    );
    expect(remaining.rows).toHaveLength(1);
  });

  it('still lets Better Auth remove its expired verification tokens', async () => {
    await database.client.execute(
      `INSERT INTO verification (id, identifier, value, expires_at)
       VALUES ('verification-1', 'identifier', 'value', 0)`,
    );

    await database.client.execute(`DELETE FROM verification WHERE id = 'verification-1'`);

    const remaining = await database.client.execute(
      `SELECT id FROM verification WHERE id = 'verification-1'`,
    );
    expect(remaining.rows).toHaveLength(0);
  });

  it('has no ON DELETE CASCADE foreign key', async () => {
    const cascading: string[] = [];
    for (const name of await tableNames()) {
      const keys = await database.client.execute(`PRAGMA foreign_key_list("${name}")`);
      if (keys.rows.some((row) => String(row.on_delete).toUpperCase() === 'CASCADE')) {
        cascading.push(name);
      }
    }

    expect(cascading).toEqual([]);
  });
});
