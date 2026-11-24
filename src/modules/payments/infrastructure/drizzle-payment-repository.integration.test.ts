import { eq } from 'drizzle-orm';

import { payments, registrations, user } from '@/shared/infrastructure/db/schema';
import { createTestDatabase } from '@/shared/infrastructure/db/test-database';
import { CryptoIdGenerator } from '@/shared/infrastructure/system-adapters';

import { DrizzlePaymentRepository } from './drizzle-payment-repository';
import { describePaymentRepositoryContract } from './payment-repository.contract';

describePaymentRepositoryContract('Drizzle', async () => {
  const database = await createTestDatabase();
  let bib = 10000;
  return {
    repository: new DrizzlePaymentRepository(database.db, new CryptoIdGenerator()),
    addOwner: async (id) => {
      await database.db.insert(user).values({ id, name: id, email: `${id}@example.test` });
    },
    addRegistration: async (id, ownerId) => {
      await database.db.insert(registrations).values({
        id,
        ownerId,
        runnerName: id,
        distance: '5K',
        shirtSize: 'size-a',
        shirtName: 'NAME',
        bibNumber: String(++bib),
        status: 'pending_payment',
        feeCents: 10000,
        locale: 'es',
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
      });
    },
    isStored: async (id) => {
      const rows = await database.db.select().from(payments).where(eq(payments.id, id));
      return rows.length === 1;
    },
    cleanup: database.cleanup,
  };
});
