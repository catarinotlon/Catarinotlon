import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { AdminGrantRepository } from '../application/ports/admin-grant-repository';
import type { AdminGrant } from '../domain/admin-grant';

/** What each adapter must supply to run the shared contract. */
export interface AdminGrantRepositoryHarness {
  /** The adapter under test. */
  readonly grants: AdminGrantRepository;
  /** Counts the stored rows, soft-deleted ones included. */
  countRows(): Promise<number>;
  /** Releases the adapter's resources. */
  cleanup(): void;
}

const grant = (id: string, email: string, minute = 0): AdminGrant => ({
  id,
  email,
  grantedBy: 'owner-1',
  grantedAt: new Date(Date.UTC(2026, 10, 24, 18, minute)),
});

/**
 * Runs the shared {@link AdminGrantRepository} contract against an adapter.
 *
 * @param name - The adapter's name.
 * @param createHarness - Builds a fresh harness for each test.
 */
export function describeAdminGrantRepositoryContract(
  name: string,
  createHarness: () => Promise<AdminGrantRepositoryHarness>,
): void {
  describe(`AdminGrantRepository contract: ${name}`, () => {
    let harness: AdminGrantRepositoryHarness;

    beforeEach(async () => {
      harness = await createHarness();
    });

    afterEach(() => {
      harness.cleanup();
    });

    it('lists active grants, oldest first, with every field intact', async () => {
      await harness.grants.add(grant('g2', 'b@example.test', 2));
      await harness.grants.add(grant('g1', 'a@example.test', 1));

      expect(await harness.grants.listActive()).toEqual([
        grant('g1', 'a@example.test', 1),
        grant('g2', 'b@example.test', 2),
      ]);
    });

    it('finds an active grant by its address', async () => {
      await harness.grants.add(grant('g1', 'a@example.test'));

      expect(await harness.grants.findActiveByEmail('a@example.test')).toEqual(
        grant('g1', 'a@example.test'),
      );
      expect(await harness.grants.findActiveByEmail('b@example.test')).toBeNull();
    });

    it('revokes a grant by soft-deleting it: it is not listed, not found, and still stored', async () => {
      await harness.grants.add(grant('g1', 'a@example.test'));

      expect(await harness.grants.revoke('g1', 'owner-1', new Date())).toBe(true);
      expect(await harness.grants.listActive()).toEqual([]);
      expect(await harness.grants.findActiveByEmail('a@example.test')).toBeNull();
      expect(await harness.countRows()).toBe(1);
    });

    it('reports an unknown or already revoked grant', async () => {
      await harness.grants.add(grant('g1', 'a@example.test'));
      await harness.grants.revoke('g1', 'owner-1', new Date());

      expect(await harness.grants.revoke('g1', 'owner-1', new Date())).toBe(false);
      expect(await harness.grants.revoke('missing', 'owner-1', new Date())).toBe(false);
    });

    it('lets an address be granted again after it was revoked', async () => {
      await harness.grants.add(grant('g1', 'a@example.test'));
      await harness.grants.revoke('g1', 'owner-1', new Date());
      await harness.grants.add(grant('g2', 'a@example.test', 5));

      expect(await harness.grants.listActive()).toEqual([grant('g2', 'a@example.test', 5)]);
    });
  });
}
