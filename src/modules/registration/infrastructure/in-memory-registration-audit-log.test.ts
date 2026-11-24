import { InMemoryRegistrationAuditLog } from './in-memory-registration-audit-log';
import { describeRegistrationAuditLogContract } from './registration-audit-log.contract';

describeRegistrationAuditLogContract('in-memory', async () => ({
  audit: new InMemoryRegistrationAuditLog(),
  addRegistration: async () => undefined,
  cleanup: () => undefined,
}));
