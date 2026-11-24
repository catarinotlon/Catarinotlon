import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type {
  EventSettingsRepository,
  EventSettingsVersion,
} from '../application/ports/event-settings-repository';
import { EMPTY_SETTINGS } from '../domain/event-settings';

/** What each adapter must supply to run the shared contract. */
export interface EventSettingsHarness {
  /** The adapter under test. */
  readonly repository: EventSettingsRepository;
  /** Releases the adapter's resources. */
  cleanup(): void;
}

const version = (id: string, feeCents: number, minute = 0): EventSettingsVersion => ({
  id,
  values: {
    ...EMPTY_SETTINGS,
    feeCents,
    venue: { es: 'Sede', en: 'Venue' },
    shirtSizes: ['size-a'],
  },
  changedFields: ['feeCents', 'venue'],
  changedBy: 'admin-1',
  createdAt: new Date(Date.UTC(2026, 5, 1, 12, minute)),
});

/**
 * Runs the shared {@link EventSettingsRepository} contract against an adapter.
 *
 * @param name - The adapter's name.
 * @param createHarness - Builds a fresh harness for each test.
 */
export function describeEventSettingsContract(
  name: string,
  createHarness: () => Promise<EventSettingsHarness>,
): void {
  describe(`EventSettingsRepository contract: ${name}`, () => {
    let harness: EventSettingsHarness;

    beforeEach(async () => {
      harness = await createHarness();
    });

    afterEach(() => {
      harness.cleanup();
    });

    it('has no version before the first save', async () => {
      expect(await harness.repository.latest()).toBeNull();
      expect(await harness.repository.history()).toEqual([]);
    });

    it('returns an appended version with every field intact', async () => {
      await harness.repository.append(version('v1', 10000));

      expect(await harness.repository.latest()).toEqual(version('v1', 10000));
    });

    it('treats the newest version as current', async () => {
      await harness.repository.append(version('v1', 10000, 0));
      await harness.repository.append(version('v2', 20000, 1));

      expect((await harness.repository.latest())?.id).toBe('v2');
    });

    it('breaks a timestamp tie by insertion order', async () => {
      await harness.repository.append(version('v1', 10000, 0));
      await harness.repository.append(version('v2', 20000, 0));

      expect((await harness.repository.latest())?.id).toBe('v2');
    });

    it('keeps every version, newest first', async () => {
      await harness.repository.append(version('v1', 10000, 0));
      await harness.repository.append(version('v2', 20000, 1));

      const history = await harness.repository.history();

      expect(history.map((item) => item.id)).toEqual(['v2', 'v1']);
    });
  });
}
