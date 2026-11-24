import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { RegistrationRepository } from '../application/ports/registration-repository';
import type { BibNumber } from '../domain/bib-number';
import { createRegistration, type Registration } from '../domain/registration';
import type { ShirtName } from '../domain/shirt-name';

/** What each adapter must supply to run the shared contract. */
export interface RegistrationRepositoryHarness {
  /** The adapter under test. */
  readonly repository: RegistrationRepository;
  /** Makes an account available to own registrations. */
  addOwner(id: string): Promise<void>;
  /** Reports whether a row is still physically stored. */
  isStored(id: string): Promise<boolean>;
  /** Releases the adapter's resources. */
  cleanup(): void;
}

function registration(overrides: Partial<Registration> = {}): Registration {
  return {
    ...createRegistration({
      id: 'reg-1',
      ownerId: 'owner-1',
      runnerName: 'Runner One',
      distance: '5K',
      shirtSize: 'size-a',
      shirtName: 'ONE' as ShirtName,
      bibNumber: '11111' as BibNumber,
      feeCents: 12345,
      locale: 'es',
      createdAt: new Date('2026-06-01T12:00:00.000Z'),
    }),
    ...overrides,
  };
}

/**
 * Runs the shared {@link RegistrationRepository} contract against an adapter.
 *
 * @param name - The adapter's name.
 * @param createHarness - Builds a fresh harness for each test.
 */
export function describeRegistrationRepositoryContract(
  name: string,
  createHarness: () => Promise<RegistrationRepositoryHarness>,
): void {
  describe(`RegistrationRepository contract: ${name}`, () => {
    let harness: RegistrationRepositoryHarness;

    beforeEach(async () => {
      harness = await createHarness();
      await harness.addOwner('owner-1');
      await harness.addOwner('owner-2');
    });

    afterEach(() => {
      harness.cleanup();
    });

    it('returns an inserted registration with every field intact', async () => {
      const inserted = registration();

      expect(await harness.repository.insert(inserted)).toEqual({ ok: true, value: undefined });
      expect(await harness.repository.findById('reg-1')).toEqual(inserted);
    });

    it('stores a manual registration that has no account', async () => {
      await harness.repository.insert(registration({ ownerId: null }));

      expect((await harness.repository.findById('reg-1'))?.ownerId).toBeNull();
    });

    it('stores the contact details of a manual registration', async () => {
      await harness.repository.insert(
        registration({
          ownerId: null,
          contactEmail: 'walkin@example.test',
          contactPhone: '5500000000',
        }),
      );

      expect(await harness.repository.findById('reg-1')).toMatchObject({
        contactEmail: 'walkin@example.test',
        contactPhone: '5500000000',
      });
    });

    it('lists every active registration across accounts, oldest first', async () => {
      await harness.repository.insert(
        registration({
          id: 'newer',
          bibNumber: '22222' as BibNumber,
          createdAt: new Date('2026-06-03T00:00:00.000Z'),
        }),
      );
      await harness.repository.insert(
        registration({
          id: 'older',
          ownerId: 'owner-2',
          bibNumber: '33333' as BibNumber,
          createdAt: new Date('2026-06-02T00:00:00.000Z'),
        }),
      );
      await harness.repository.insert(
        registration({ id: 'deleted', bibNumber: '44444' as BibNumber }),
      );
      await harness.repository.softDelete('deleted', 'admin-1');

      const listed = await harness.repository.listAll();

      expect(listed.map((item) => item.id)).toEqual(['older', 'newer']);
    });

    it('returns null for an unknown id', async () => {
      expect(await harness.repository.findById('missing')).toBeNull();
    });

    it('refuses a bib number already in use', async () => {
      await harness.repository.insert(registration());

      const second = await harness.repository.insert(registration({ id: 'reg-2' }));

      expect(second).toEqual({ ok: false, error: { code: 'registration.bib_number_taken' } });
    });

    it('never reuses the bib number of a soft-deleted registration', async () => {
      await harness.repository.insert(registration());
      await harness.repository.softDelete('reg-1', 'admin-1');

      const second = await harness.repository.insert(registration({ id: 'reg-2' }));

      expect(second).toEqual({ ok: false, error: { code: 'registration.bib_number_taken' } });
    });

    it('lists only the owner’s registrations, oldest first', async () => {
      await harness.repository.insert(
        registration({
          id: 'newer',
          bibNumber: '22222' as BibNumber,
          createdAt: new Date('2026-06-03T00:00:00.000Z'),
        }),
      );
      await harness.repository.insert(
        registration({
          id: 'older',
          bibNumber: '33333' as BibNumber,
          createdAt: new Date('2026-06-02T00:00:00.000Z'),
        }),
      );
      await harness.repository.insert(
        registration({ id: 'other', ownerId: 'owner-2', bibNumber: '44444' as BibNumber }),
      );

      const listed = await harness.repository.listByOwner('owner-1');

      expect(listed.map((item) => item.id)).toEqual(['older', 'newer']);
    });

    it('persists updates', async () => {
      await harness.repository.insert(registration());

      await harness.repository.update(
        registration({ shirtName: 'NEW' as ShirtName, status: 'confirmed', distance: '3K' }),
      );

      expect(await harness.repository.findById('reg-1')).toMatchObject({
        shirtName: 'NEW',
        status: 'confirmed',
        distance: '3K',
      });
    });

    it('does not return a soft-deleted registration by id', async () => {
      await harness.repository.insert(registration());

      await harness.repository.softDelete('reg-1', 'admin-1');

      expect(await harness.repository.findById('reg-1')).toBeNull();
    });

    it('does not list or count a soft-deleted registration', async () => {
      await harness.repository.insert(registration());

      await harness.repository.softDelete('reg-1', 'admin-1');

      expect(await harness.repository.listByOwner('owner-1')).toHaveLength(0);
    });

    it('keeps a soft-deleted row in storage', async () => {
      await harness.repository.insert(registration());

      await harness.repository.softDelete('reg-1', 'admin-1');

      expect(await harness.isStored('reg-1')).toBe(true);
    });

    it('brings a registration back on restore', async () => {
      await harness.repository.insert(registration());
      await harness.repository.softDelete('reg-1', 'admin-1');

      await harness.repository.restore('reg-1');

      expect((await harness.repository.findById('reg-1'))?.id).toBe('reg-1');
    });

    it('ignores an update to a soft-deleted registration', async () => {
      await harness.repository.insert(registration());
      await harness.repository.softDelete('reg-1', 'admin-1');

      await harness.repository.update(registration({ shirtName: 'NEW' as ShirtName }));
      await harness.repository.restore('reg-1');

      expect((await harness.repository.findById('reg-1'))?.shirtName).toBe('ONE');
    });
  });
}
