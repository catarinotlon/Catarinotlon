import { InMemoryKitPickupRepository } from './in-memory-kit-pickup-repository';
import { InMemoryTicketRepository } from './in-memory-ticket-repository';
import { describeTicketingContracts } from './ticketing-repositories.contract';

describeTicketingContracts('in-memory', async () => {
  const tickets = new InMemoryTicketRepository();
  return {
    tickets,
    pickups: new InMemoryKitPickupRepository(),
    addRegistration: async () => undefined,
    isTicketStored: async (id) => tickets.hasStoredRow(id),
    cleanup: () => undefined,
  };
});
