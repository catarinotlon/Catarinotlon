import type { PaymentRepository } from '../application/ports/payment-repository';
import type { Payment } from '../domain/payment';

/** In-memory {@link PaymentRepository} double for tests. */
export class InMemoryPaymentRepository implements PaymentRepository {
  private readonly rows = new Map<string, { payment: Payment; deleted: boolean }>();

  async insert(payment: Payment): Promise<void> {
    this.rows.set(payment.id, { payment, deleted: false });
  }

  async findById(id: string): Promise<Payment | null> {
    const row = this.rows.get(id);
    return row && !row.deleted ? row.payment : null;
  }

  async listByOwner(ownerId: string): Promise<Payment[]> {
    return [...this.rows.values()]
      .filter((row) => !row.deleted && row.payment.ownerId === ownerId)
      .map((row) => row.payment)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async listAll(): Promise<Payment[]> {
    return [...this.rows.values()]
      .filter((row) => !row.deleted)
      .map((row) => row.payment)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async update(payment: Payment): Promise<void> {
    const row = this.rows.get(payment.id);
    if (row && !row.deleted) row.payment = payment;
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
   * @param id - The payment's UUID.
   * @returns `true` when the row exists.
   */
  hasStoredRow(id: string): boolean {
    return this.rows.has(id);
  }
}
