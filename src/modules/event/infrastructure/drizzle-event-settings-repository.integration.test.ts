import { createTestDatabase } from '@/shared/infrastructure/db/test-database';

import { DrizzleEventSettingsRepository } from './drizzle-event-settings-repository';
import { describeEventSettingsContract } from './event-settings-repository.contract';

describeEventSettingsContract('Drizzle', async () => {
  const database = await createTestDatabase();
  return {
    repository: new DrizzleEventSettingsRepository(database.db),
    cleanup: database.cleanup,
  };
});
