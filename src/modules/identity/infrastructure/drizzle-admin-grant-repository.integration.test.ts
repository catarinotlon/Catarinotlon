import { sql } from 'drizzle-orm';

import { createTestDatabase } from '@/shared/infrastructure/db/test-database';

import { describeAdminGrantRepositoryContract } from './admin-grant-repository.contract';
import { DrizzleAdminGrantRepository } from './drizzle-admin-grant-repository';

describeAdminGrantRepositoryContract('Drizzle', async () => {
  const database = await createTestDatabase();
  return {
    grants: new DrizzleAdminGrantRepository(database.db),
    countRows: async () => {
      const rows = await database.db.all<{ n: number }>(
        sql`SELECT count(*) AS n FROM admin_grants`,
      );
      return Number(rows[0]?.n ?? 0);
    },
    cleanup: database.cleanup,
  };
});
