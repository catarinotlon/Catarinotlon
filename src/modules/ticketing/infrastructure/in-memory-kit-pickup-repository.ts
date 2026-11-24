import type { KitPickupRepository } from '../application/ports/kit-pickup-repository';
import type { KitPickup } from '../domain/kit-pickup';

/** In-memory {@link KitPickupRepository} double for tests. */
export class InMemoryKitPickupRepository implements KitPickupRepository {
  /** Every delivery on record, including undone ones. */
  readonly rows: KitPickup[] = [];

  async activeFor(registrationId: string): Promise<KitPickup | null> {
    return (
      this.rows.find((row) => row.registrationId === registrationId && row.undoneAt === null) ??
      null
    );
  }

  async listActive(): Promise<KitPickup[]> {
    return this.rows.filter((row) => row.undoneAt === null);
  }

  async insert(pickup: KitPickup): Promise<void> {
    this.rows.push(pickup);
  }

  async update(pickup: KitPickup): Promise<void> {
    const index = this.rows.findIndex((row) => row.id === pickup.id);
    if (index >= 0) this.rows[index] = pickup;
  }
}
