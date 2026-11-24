import { describeAdminGrantRepositoryContract } from './admin-grant-repository.contract';
import { InMemoryAdminGrantRepository } from './in-memory-admin-grant-repository';

describeAdminGrantRepositoryContract('in-memory', async () => {
  const grants = new InMemoryAdminGrantRepository();
  return { grants, countRows: async () => grants.rowCount(), cleanup: () => undefined };
});
