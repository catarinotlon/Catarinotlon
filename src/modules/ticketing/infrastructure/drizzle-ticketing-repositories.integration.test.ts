import { eq } from 'drizzle-orm';

import { registrations, tickets } from '@/shared/infrastructure/db/schema';
import { createTestDatabase } from '@/shared/infrastructure/db/test-database';

import { DrizzleKitPickupRepository } from './drizzle-kit-pickup-repository';
import { DrizzleTicketRepository } from './drizzle-ticket-repository';
import { describeTicketingContracts } from './ticketing-repositories.contract';

describeTicketingContracts('Drizzle', async () => {
  const database = await createTestDatabase();
  let bib = 10000;
  return {
    tickets: new DrizzleTicketRepository(database.db),
    pickups: new DrizzleKitPickupRepository(database.db),
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
    isTicketStored: async (id) => {
      const rows = await database.db.select().from(tickets).where(eq(tickets.id, id));
      return rows.length === 1;
    },
    cleanup: database.cleanup,
  };
});
