import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type {
  RegistrationAuditLog,
  RegistrationChange,
} from '../application/ports/registration-audit-log';

/** What each adapter must supply to run the shared contract. */
export interface RegistrationAuditLogHarness {
  /** The adapter under test. */
  readonly audit: RegistrationAuditLog;
  /** Makes a registration available. */
  addRegistration(id: string): Promise<void>;
  /** Releases the adapter's resources. */
  cleanup(): void;
}

const change = (id: string, registrationId = 'reg-1'): RegistrationChange => ({
  id,
  registrationId,
  changedBy: 'admin-1',
  field: 'shirtName',
  previousValue: 'OLD',
  newValue: 'NEW',
  changedAt: new Date('2026-06-01T12:00:00.000Z'),
});

/**
 * Runs the shared {@link RegistrationAuditLog} contract against an adapter.
 *
 * @param name - The adapter's name.
 * @param createHarness - Builds a fresh harness for each test.
 */
export function describeRegistrationAuditLogContract(
  name: string,
  createHarness: () => Promise<RegistrationAuditLogHarness>,
): void {
  describe(`RegistrationAuditLog contract: ${name}`, () => {
    let harness: RegistrationAuditLogHarness;

    beforeEach(async () => {
      harness = await createHarness();
      await harness.addRegistration('reg-1');
      await harness.addRegistration('reg-2');
    });

    afterEach(() => {
      harness.cleanup();
    });

    it('returns a recorded change with every field intact', async () => {
      await harness.audit.record(change('c1'));

      expect(await harness.audit.listFor('reg-1')).toEqual([change('c1')]);
    });

    it('keeps insertion order when timestamps tie', async () => {
      await harness.audit.record(change('c1'));
      await harness.audit.record(change('c2'));

      const listed = await harness.audit.listFor('reg-1');

      expect(listed.map((item) => item.id)).toEqual(['c1', 'c2']);
    });

    it('lists only the requested registration', async () => {
      await harness.audit.record(change('c1'));
      await harness.audit.record(change('c2', 'reg-2'));

      const listed = await harness.audit.listFor('reg-2');

      expect(listed.map((item) => item.id)).toEqual(['c2']);
    });
  });
}
