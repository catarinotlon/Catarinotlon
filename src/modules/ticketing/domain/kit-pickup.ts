/** A kit delivery. It stays on record when undone. */
export interface KitPickup {
  /** Delivery UUID. */
  readonly id: string;
  /** The registration whose kit was delivered. */
  readonly registrationId: string;
  /** The admin who delivered it. */
  readonly deliveredBy: string;
  /** When it was delivered. */
  readonly deliveredAt: Date;
  /** Who collected it, when noted. Anyone may collect with the ticket. */
  readonly collectedBy: string | null;
  /** The admin who undid the delivery. */
  readonly undoneBy: string | null;
  /** When the delivery was undone. */
  readonly undoneAt: Date | null;
}
