import { InMemoryPaymentRepository } from './in-memory-payment-repository';
import { describePaymentRepositoryContract } from './payment-repository.contract';

describePaymentRepositoryContract('in-memory', async () => {
  const repository = new InMemoryPaymentRepository();
  return {
    repository,
    addOwner: async () => undefined,
    addRegistration: async () => undefined,
    isStored: async (id) => repository.hasStoredRow(id),
    cleanup: () => undefined,
  };
});
