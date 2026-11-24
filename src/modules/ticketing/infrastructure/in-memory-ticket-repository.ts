import type { TicketRepository } from '../application/ports/ticket-repository';
import type { Ticket } from '../domain/ticket';

/** In-memory {@link TicketRepository} double for tests. */
export class InMemoryTicketRepository implements TicketRepository {
  private readonly rows = new Map<string, { ticket: Ticket; deleted: boolean }>();

  async insert(ticket: Ticket): Promise<void> {
    const duplicate = [...this.rows.values()].some(
      (row) => !row.deleted && row.ticket.registrationId === ticket.registrationId,
    );
    if (duplicate) throw new Error('A registration can only have one active ticket');
    this.rows.set(ticket.id, { ticket, deleted: false });
  }

  async findById(id: string): Promise<Ticket | null> {
    const row = this.rows.get(id);
    return row && !row.deleted ? row.ticket : null;
  }

  async findByRegistration(registrationId: string): Promise<Ticket | null> {
    const row = [...this.rows.values()].find(
      (item) => !item.deleted && item.ticket.registrationId === registrationId,
    );
    return row?.ticket ?? null;
  }

  async softDelete(id: string, _deletedBy: string): Promise<void> {
    const row = this.rows.get(id);
    if (row) row.deleted = true;
  }

  async restore(id: string): Promise<void> {
    const row = this.rows.get(id);
    if (row) row.deleted = false;
  }

  /**
   * Reports whether a row is physically stored, including soft-deleted ones.
   *
   * @param id - The ticket's UUID.
   * @returns `true` when the row exists.
   */
  hasStoredRow(id: string): boolean {
    return this.rows.has(id);
  }
}
