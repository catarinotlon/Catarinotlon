import { and, eq, isNull } from 'drizzle-orm';

import type { DatabaseClient } from '@/shared/infrastructure/db/database-client';
import { kitPickups } from '@/shared/infrastructure/db/schema';

import type { KitPickupRepository } from '../application/ports/kit-pickup-repository';
import type { KitPickup } from '../domain/kit-pickup';

const toEntity = (row: typeof kitPickups.$inferSelect): KitPickup => ({
  id: row.id,
  registrationId: row.registrationId,
  deliveredBy: row.deliveredBy,
  deliveredAt: row.deliveredAt,
  collectedBy: row.collectedBy,
  undoneBy: row.undoneBy,
  undoneAt: row.undoneAt,
});

/** Drizzle adapter of the {@link KitPickupRepository} port. */
export class DrizzleKitPickupRepository implements KitPickupRepository {
  /**
   * Creates the repository.
   *
   * @param db - The database or an open transaction.
   */
  constructor(private readonly db: DatabaseClient) {}

  async activeFor(registrationId: string): Promise<KitPickup | null> {
    const [row] = await this.db
      .select()
      .from(kitPickups)
      .where(
        and(
          eq(kitPickups.registrationId, registrationId),
          isNull(kitPickups.undoneAt),
          isNull(kitPickups.deletedAt),
        ),
      );
    return row ? toEntity(row) : null;
  }

  async listActive(): Promise<KitPickup[]> {
    const rows = await this.db
      .select()
      .from(kitPickups)
      .where(and(isNull(kitPickups.undoneAt), isNull(kitPickups.deletedAt)));
    return rows.map(toEntity);
  }

  async insert(pickup: KitPickup): Promise<void> {
    await this.db.insert(kitPickups).values(pickup);
  }

  async update(pickup: KitPickup): Promise<void> {
    await this.db
      .update(kitPickups)
      .set({
        collectedBy: pickup.collectedBy,
        undoneBy: pickup.undoneBy,
        undoneAt: pickup.undoneAt,
      })
      .where(and(eq(kitPickups.id, pickup.id), isNull(kitPickups.deletedAt)));
  }
}
