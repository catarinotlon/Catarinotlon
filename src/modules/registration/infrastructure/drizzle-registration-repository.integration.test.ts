import { eq } from 'drizzle-orm';

import { registrations, user } from '@/shared/infrastructure/db/schema';
import { createTestDatabase } from '@/shared/infrastructure/db/test-database';

import { DrizzleRegistrationRepository } from './drizzle-registration-repository';
import { describeRegistrationRepositoryContract } from './registration-repository.contract';

describeRegistrationRepositoryContract('Drizzle', async () => {
  const database = await createTestDatabase();
  return {
    repository: new DrizzleRegistrationRepository(database.db),
    addOwner: async (id) => {
      await database.db.insert(user).values({ id, name: id, email: `${id}@example.test` });
    },
    isStored: async (id) => {
      const rows = await database.db.select().from(registrations).where(eq(registrations.id, id));
      return rows.length === 1;
    },
    cleanup: database.cleanup,
  };
});
