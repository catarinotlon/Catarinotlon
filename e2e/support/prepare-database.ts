import { mkdirSync, rmSync } from 'node:fs';

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

const DIRECTORY = 'e2e/.tmp';

rmSync(DIRECTORY, { recursive: true, force: true });
mkdirSync(DIRECTORY, { recursive: true });

const client = createClient({ url: `file:${DIRECTORY}/e2e.db` });
await migrate(drizzle(client), { migrationsFolder: 'drizzle' });
client.close();
