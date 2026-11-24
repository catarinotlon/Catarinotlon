import type { LibSQLDatabase } from 'drizzle-orm/libsql';

import type * as schema from './schema';

/** The full Drizzle database, able to open transactions. */
export type AppDatabase = LibSQLDatabase<typeof schema>;

/**
 * The query surface adapters receive: a database or an open transaction.
 *
 * @remarks
 * `delete` is deliberately absent, because no row is ever physically deleted.
 */
export type DatabaseClient = Pick<AppDatabase, 'select' | 'insert' | 'update'>;
