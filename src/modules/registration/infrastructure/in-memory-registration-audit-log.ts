import type {
  RegistrationAuditLog,
  RegistrationChange,
} from '../application/ports/registration-audit-log';

/** In-memory {@link RegistrationAuditLog} double for tests. */
export class InMemoryRegistrationAuditLog implements RegistrationAuditLog {
  /** Every recorded change. */
  readonly entries: RegistrationChange[] = [];

  async record(change: RegistrationChange): Promise<void> {
    this.entries.push(change);
  }

  async listFor(registrationId: string): Promise<RegistrationChange[]> {
    return this.entries.filter((entry) => entry.registrationId === registrationId);
  }
}
