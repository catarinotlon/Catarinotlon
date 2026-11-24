import type {
  EventSettingsRepository,
  EventSettingsVersion,
} from '../application/ports/event-settings-repository';

/** In-memory {@link EventSettingsRepository} double for tests. */
export class InMemoryEventSettingsRepository implements EventSettingsRepository {
  private readonly versions: EventSettingsVersion[] = [];

  async latest(): Promise<EventSettingsVersion | null> {
    return this.versions.at(-1) ?? null;
  }

  async history(): Promise<EventSettingsVersion[]> {
    return [...this.versions].reverse();
  }

  async append(version: EventSettingsVersion): Promise<void> {
    this.versions.push(version);
  }
}
