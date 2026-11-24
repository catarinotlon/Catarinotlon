import 'server-only';

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

import { env } from '../env';
import type { AppDatabase } from './database-client';
import * as schema from './schema';

const client = createClient(
  env.TURSO_AUTH_TOKEN
    ? { url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN }
    : { url: env.TURSO_DATABASE_URL },
);

/** The application's database connection. */
export const db: AppDatabase = drizzle(client, { schema });
