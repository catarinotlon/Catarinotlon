import { registrations } from '@/shared/infrastructure/db/schema';
import { createTestDatabase } from '@/shared/infrastructure/db/test-database';

import { DrizzleRegistrationAuditLog } from './drizzle-registration-audit-log';
import { describeRegistrationAuditLogContract } from './registration-audit-log.contract';

describeRegistrationAuditLogContract('Drizzle', async () => {
  const database = await createTestDatabase();
  let bib = 10000;
  return {
    audit: new DrizzleRegistrationAuditLog(database.db),
    addRegistration: async (id) => {
      await database.db.insert(registrations).values({
        id,
        ownerId: null,
        runnerName: id,
        distance: '5K',
        shirtSize: 'size-a',
        shirtName: 'NAME',
        bibNumber: String(++bib),
        status: 'confirmed',
        feeCents: 10000,
        locale: 'es',
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
      });
    },
    cleanup: database.cleanup,
  };
});
