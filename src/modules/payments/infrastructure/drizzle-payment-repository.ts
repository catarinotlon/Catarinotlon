import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import type { IdGenerator } from '@/shared/domain/system-ports';
import type { DatabaseClient } from '@/shared/infrastructure/db/database-client';
import { paymentRegistrations, payments, receipts } from '@/shared/infrastructure/db/schema';

import type { PaymentRepository } from '../application/ports/payment-repository';
import type { Payment, ReceiptFile } from '../domain/payment';

type PaymentRow = typeof payments.$inferSelect;
type ReceiptRow = typeof receipts.$inferSelect;

const toReceipt = (row: ReceiptRow): ReceiptFile => ({
  pathname: row.pathname,
  contentType: row.contentType,
  sizeBytes: row.sizeBytes,
  uploadedAt: row.uploadedAt,
});

/** Drizzle adapter of the {@link PaymentRepository} port. */
export class DrizzlePaymentRepository implements PaymentRepository {
  /**
   * Creates the repository.
   *
   * @param db - The database or an open transaction.
   * @param ids - UUID source for the child rows.
   */
  constructor(
    private readonly db: DatabaseClient,
    private readonly ids: IdGenerator,
  ) {}

  async insert(payment: Payment): Promise<void> {
    await this.db.insert(payments).values({
      id: payment.id,
      ownerId: payment.ownerId,
      concept: payment.concept,
      status: payment.status,
      amountCents: payment.amountCents,
      rejectionReason: payment.rejectionReason,
      reviewedBy: payment.reviewedBy,
      reviewedAt: payment.reviewedAt,
      createdAt: payment.createdAt,
    });
    if (payment.registrationIds.length > 0) {
      await this.db.insert(paymentRegistrations).values(
        payment.registrationIds.map((registrationId) => ({
          id: this.ids.uuid(),
          paymentId: payment.id,
          registrationId,
        })),
      );
    }
    await this.appendReceipts(payment, 0);
  }

  async findById(id: string): Promise<Payment | null> {
    const [row] = await this.db
      .select()
      .from(payments)
      .where(and(eq(payments.id, id), isNull(payments.deletedAt)));
    return row ? this.hydrate(row) : null;
  }

  async listByOwner(ownerId: string): Promise<Payment[]> {
    const rows = await this.db
      .select()
      .from(payments)
      .where(and(eq(payments.ownerId, ownerId), isNull(payments.deletedAt)))
      .orderBy(asc(payments.createdAt));
    return Promise.all(rows.map((row) => this.hydrate(row)));
  }

  async listAll(): Promise<Payment[]> {
    const rows = await this.db
      .select()
      .from(payments)
      .where(isNull(payments.deletedAt))
      .orderBy(asc(payments.createdAt));
    return Promise.all(rows.map((row) => this.hydrate(row)));
  }

  async update(payment: Payment): Promise<void> {
    await this.db
      .update(payments)
      .set({
        status: payment.status,
        rejectionReason: payment.rejectionReason,
        reviewedBy: payment.reviewedBy,
        reviewedAt: payment.reviewedAt,
      })
      .where(and(eq(payments.id, payment.id), isNull(payments.deletedAt)));

    const stored = await this.db
      .select({ id: receipts.id })
      .from(receipts)
      .where(eq(receipts.paymentId, payment.id));
    await this.appendReceipts(payment, stored.length);
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    const marker = { deletedAt: new Date(), deletedBy };
    await this.db
      .update(payments)
      .set(marker)
      .where(and(eq(payments.id, id), isNull(payments.deletedAt)));
    await this.db
      .update(paymentRegistrations)
      .set(marker)
      .where(and(eq(paymentRegistrations.paymentId, id), isNull(paymentRegistrations.deletedAt)));
    await this.db
      .update(receipts)
      .set(marker)
      .where(and(eq(receipts.paymentId, id), isNull(receipts.deletedAt)));
  }

  async restore(id: string): Promise<void> {
    const cleared = { deletedAt: null, deletedBy: null };
    await this.db.update(payments).set(cleared).where(eq(payments.id, id));
    await this.db
      .update(paymentRegistrations)
      .set(cleared)
      .where(eq(paymentRegistrations.paymentId, id));
    await this.db.update(receipts).set(cleared).where(eq(receipts.paymentId, id));
  }

  private async appendReceipts(payment: Payment, storedCount: number): Promise<void> {
    const ordered = [...payment.previousReceipts, payment.receipt];
    const fresh = ordered.slice(storedCount);
    if (fresh.length === 0) return;

    await this.db.insert(receipts).values(
      fresh.map((file, index) => ({
        id: this.ids.uuid(),
        paymentId: payment.id,
        pathname: file.pathname,
        contentType: file.contentType,
        sizeBytes: file.sizeBytes,
        uploadedAt: file.uploadedAt,
        position: storedCount + index,
      })),
    );
  }

  private async hydrate(row: PaymentRow): Promise<Payment> {
    const covered = await this.db
      .select({ registrationId: paymentRegistrations.registrationId })
      .from(paymentRegistrations)
      .where(
        and(eq(paymentRegistrations.paymentId, row.id), isNull(paymentRegistrations.deletedAt)),
      )
      .orderBy(sql`rowid`);
    const files = await this.db
      .select()
      .from(receipts)
      .where(and(eq(receipts.paymentId, row.id), isNull(receipts.deletedAt)))
      .orderBy(asc(receipts.position));

    const current = files.at(-1);
    if (!current) throw new Error(`Payment ${row.id} has no receipt`);

    return {
      id: row.id,
      ownerId: row.ownerId,
      concept: row.concept,
      status: row.status,
      registrationIds: covered.map((item) => item.registrationId),
      amountCents: row.amountCents,
      receipt: toReceipt(current),
      previousReceipts: files.slice(0, -1).map(toReceipt),
      reviewedBy: row.reviewedBy,
      reviewedAt: row.reviewedAt,
      rejectionReason: row.rejectionReason,
      createdAt: row.createdAt,
    };
  }
}
