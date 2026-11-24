import { InMemoryRegistrationRepository } from './in-memory-registration-repository';
import { describeRegistrationRepositoryContract } from './registration-repository.contract';

describeRegistrationRepositoryContract('in-memory', async () => {
  const repository = new InMemoryRegistrationRepository();
  return {
    repository,
    addOwner: async () => undefined,
    isStored: async (id) => repository.hasStoredRow(id),
    cleanup: () => undefined,
  };
});
