import type { Ticket } from '../../domain/ticket';

/**
 * Stores tickets.
 *
 * @remarks
 * A registration has at most one active ticket. There is no hard delete.
 *
 * @example
 * ```ts
 * const ticket = await tickets.findByRegistration(registrationId);
 * ```
 */
export interface TicketRepository {
  /**
   * Inserts a ticket.
   *
   * @param ticket - The ticket.
   */
  insert(ticket: Ticket): Promise<void>;

  /**
   * Finds an active ticket by its UUID.
   *
   * @param id - The ticket's UUID.
   * @returns The ticket, or `null`.
   */
  findById(id: string): Promise<Ticket | null>;

  /**
   * Finds the active ticket of a registration.
   *
   * @param registrationId - The registration's UUID.
   * @returns The ticket, or `null`.
   */
  findByRegistration(registrationId: string): Promise<Ticket | null>;

  /**
   * Marks a ticket as deleted.
   *
   * @param id - The ticket's UUID.
   * @param deletedBy - The user performing the deletion.
   */
  softDelete(id: string, deletedBy: string): Promise<void>;

  /**
   * Restores a soft-deleted ticket.
   *
   * @param id - The ticket's UUID.
   */
  restore(id: string): Promise<void>;
}
