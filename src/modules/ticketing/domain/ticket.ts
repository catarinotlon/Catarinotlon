/**
 * The ticket of a confirmed registration.
 *
 * @remarks
 * Its QR code encodes only {@link Ticket.id}, never personal data.
 */
export interface Ticket {
  /** Ticket UUID, the only content of the QR code. */
  readonly id: string;
  /** The registration this ticket belongs to. */
  readonly registrationId: string;
  /** When the ticket was issued. */
  readonly issuedAt: Date;
}
