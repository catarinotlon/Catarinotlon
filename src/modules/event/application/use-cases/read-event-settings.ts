import { EMPTY_SETTINGS, type EventSettingsValues } from '../../domain/event-settings';
import type { EventSettingsRepository } from '../ports/event-settings-repository';

/**
 * Reads the current event settings.
 *
 * @remarks
 * A missing setting is an expected state, so this never fails on an empty store.
 *
 * @param deps - The settings repository.
 * @returns The latest values, or empty settings before the first save.
 *
 * @example
 * ```ts
 * const settings = await readEventSettings({ settings: repository });
 * ```
 */
export async function readEventSettings(deps: {
  readonly settings: EventSettingsRepository;
}): Promise<EventSettingsValues> {
  const latest = await deps.settings.latest();
  return latest?.values ?? EMPTY_SETTINGS;
}
