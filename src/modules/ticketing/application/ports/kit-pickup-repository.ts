import type { KitPickup } from '../../domain/kit-pickup';

/**
 * Stores kit deliveries.
 *
 * @remarks
 * An undone delivery stays on record. There is no hard delete.
 *
 * @example
 * ```ts
 * const pickup = await pickups.activeFor(registrationId);
 * ```
 */
export interface KitPickupRepository {
  /**
   * Finds the delivery in effect for a registration.
   *
   * @param registrationId - The registration's UUID.
   * @returns The delivery that has not been undone, or `null`.
   */
  activeFor(registrationId: string): Promise<KitPickup | null>;

  /**
   * Lists every delivery in effect.
   *
   * @returns The deliveries that have not been undone.
   */
  listActive(): Promise<KitPickup[]>;

  /**
   * Records a delivery.
   *
   * @param pickup - The delivery.
   */
  insert(pickup: KitPickup): Promise<void>;

  /**
   * Saves changes to a delivery.
   *
   * @param pickup - The updated delivery.
   */
  update(pickup: KitPickup): Promise<void>;
}
