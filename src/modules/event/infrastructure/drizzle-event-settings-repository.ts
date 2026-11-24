import { desc, isNull, sql } from 'drizzle-orm';

import type { DatabaseClient } from '@/shared/infrastructure/db/database-client';
import { eventSettingsVersions } from '@/shared/infrastructure/db/schema';

import type {
  EventSettingsRepository,
  EventSettingsVersion,
} from '../application/ports/event-settings-repository';
import type { EventSettingsValues, SettingKey } from '../domain/event-settings';

const toVersion = (row: typeof eventSettingsVersions.$inferSelect): EventSettingsVersion => ({
  id: row.id,
  values: row.values as EventSettingsValues,
  changedFields: row.changedFields as SettingKey[],
  changedBy: row.changedBy,
  createdAt: row.createdAt,
});

/** Drizzle adapter of the append-only {@link EventSettingsRepository} port. */
export class DrizzleEventSettingsRepository implements EventSettingsRepository {
  /**
   * Creates the repository.
   *
   * @param db - The database or an open transaction.
   */
  constructor(private readonly db: DatabaseClient) {}

  async latest(): Promise<EventSettingsVersion | null> {
    const [row] = await this.newestFirst().limit(1);
    return row ? toVersion(row) : null;
  }

  async history(): Promise<EventSettingsVersion[]> {
    const rows = await this.newestFirst();
    return rows.map(toVersion);
  }

  async append(version: EventSettingsVersion): Promise<void> {
    await this.db.insert(eventSettingsVersions).values({
      id: version.id,
      values: version.values,
      changedFields: version.changedFields,
      changedBy: version.changedBy,
      createdAt: version.createdAt,
    });
  }

  private newestFirst() {
    return this.db
      .select()
      .from(eventSettingsVersions)
      .where(isNull(eventSettingsVersions.deletedAt))
      .orderBy(desc(eventSettingsVersions.createdAt), desc(sql`rowid`));
  }
}
