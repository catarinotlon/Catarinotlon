import { and, eq, isNull } from 'drizzle-orm';

import type { DatabaseClient } from '@/shared/infrastructure/db/database-client';
import { tickets } from '@/shared/infrastructure/db/schema';

import type { TicketRepository } from '../application/ports/ticket-repository';
import type { Ticket } from '../domain/ticket';

const toEntity = (row: typeof tickets.$inferSelect): Ticket => ({
  id: row.id,
  registrationId: row.registrationId,
  issuedAt: row.issuedAt,
});

/** Drizzle adapter of the {@link TicketRepository} port. */
export class DrizzleTicketRepository implements TicketRepository {
  /**
   * Creates the repository.
   *
   * @param db - The database or an open transaction.
   */
  constructor(private readonly db: DatabaseClient) {}

  async insert(ticket: Ticket): Promise<void> {
    await this.db.insert(tickets).values(ticket);
  }

  async findById(id: string): Promise<Ticket | null> {
    const [row] = await this.db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, id), isNull(tickets.deletedAt)));
    return row ? toEntity(row) : null;
  }

  async findByRegistration(registrationId: string): Promise<Ticket | null> {
    const [row] = await this.db
      .select()
      .from(tickets)
      .where(and(eq(tickets.registrationId, registrationId), isNull(tickets.deletedAt)));
    return row ? toEntity(row) : null;
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    await this.db
      .update(tickets)
      .set({ deletedAt: new Date(), deletedBy })
      .where(and(eq(tickets.id, id), isNull(tickets.deletedAt)));
  }

  async restore(id: string): Promise<void> {
    await this.db
      .update(tickets)
      .set({ deletedAt: null, deletedBy: null })
      .where(eq(tickets.id, id));
  }
}
