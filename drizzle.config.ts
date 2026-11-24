import { defineConfig } from 'drizzle-kit';

import { readDatabaseEnv } from './src/shared/infrastructure/database-env';

const { url, authToken } = readDatabaseEnv();

export default defineConfig({
  out: './drizzle',
  schema: './src/shared/infrastructure/db/schema/index.ts',
  dialect: 'turso',
  dbCredentials: authToken ? { url, authToken } : { url },
});
