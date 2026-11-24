import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { PaymentRepository } from '../application/ports/payment-repository';
import type { Payment, ReceiptFile } from '../domain/payment';

/** What each adapter must supply to run the shared contract. */
export interface PaymentRepositoryHarness {
  /** The adapter under test. */
  readonly repository: PaymentRepository;
  /** Makes an account available to own payments. */
  addOwner(id: string): Promise<void>;
  /** Makes a registration available to be covered. */
  addRegistration(id: string, ownerId: string): Promise<void>;
  /** Reports whether a row is still physically stored. */
  isStored(id: string): Promise<boolean>;
  /** Releases the adapter's resources. */
  cleanup(): void;
}

const file = (name: string, minute: number): ReceiptFile => ({
  pathname: `receipts/owner-1/${name}`,
  contentType: 'application/pdf',
  sizeBytes: 1000 + minute,
  uploadedAt: new Date(Date.UTC(2026, 5, 1, 12, minute)),
});

const payment = (overrides: Partial<Payment> = {}): Payment => ({
  id: 'payment-1',
  ownerId: 'owner-1',
  concept: 'CATARINOTLON - OWNER ONE',
  status: 'in_review',
  registrationIds: ['reg-1', 'reg-2'],
  amountCents: 20000,
  receipt: file('first.pdf', 0),
  previousReceipts: [],
  reviewedBy: null,
  reviewedAt: null,
  rejectionReason: null,
  createdAt: new Date('2026-06-01T12:00:00.000Z'),
  ...overrides,
});

/**
 * Runs the shared {@link PaymentRepository} contract against an adapter.
 *
 * @param name - The adapter's name.
 * @param createHarness - Builds a fresh harness for each test.
 */
export function describePaymentRepositoryContract(
  name: string,
  createHarness: () => Promise<PaymentRepositoryHarness>,
): void {
  describe(`PaymentRepository contract: ${name}`, () => {
    let harness: PaymentRepositoryHarness;

    beforeEach(async () => {
      harness = await createHarness();
      await harness.addOwner('owner-1');
      await harness.addOwner('owner-2');
      await harness.addRegistration('reg-1', 'owner-1');
      await harness.addRegistration('reg-2', 'owner-1');
    });

    afterEach(() => {
      harness.cleanup();
    });

    it('returns an inserted payment with every field intact', async () => {
      await harness.repository.insert(payment());

      expect(await harness.repository.findById('payment-1')).toEqual(payment());
    });

    it('returns null for an unknown id', async () => {
      expect(await harness.repository.findById('missing')).toBeNull();
    });

    it('persists a review decision', async () => {
      await harness.repository.insert(payment());
      const reviewedAt = new Date('2026-06-02T12:00:00.000Z');

      await harness.repository.update(
        payment({
          status: 'rejected',
          reviewedBy: 'admin-1',
          reviewedAt,
          rejectionReason: 'Wrong amount',
        }),
      );

      expect(await harness.repository.findById('payment-1')).toMatchObject({
        status: 'rejected',
        reviewedBy: 'admin-1',
        reviewedAt,
        rejectionReason: 'Wrong amount',
      });
    });

    it('keeps the receipt history in upload order across replacements', async () => {
      const first = file('first.pdf', 0);
      const second = file('second.pdf', 1);
      const third = file('third.pdf', 2);
      await harness.repository.insert(payment({ receipt: first }));

      await harness.repository.update(payment({ receipt: second, previousReceipts: [first] }));
      await harness.repository.update(
        payment({ receipt: third, previousReceipts: [first, second] }),
      );

      expect(await harness.repository.findById('payment-1')).toMatchObject({
        receipt: third,
        previousReceipts: [first, second],
      });
    });

    it('orders receipts correctly when they share a timestamp', async () => {
      const first = file('first.pdf', 0);
      const second = { ...file('second.pdf', 0), sizeBytes: 5 };
      await harness.repository.insert(payment({ receipt: first }));

      await harness.repository.update(payment({ receipt: second, previousReceipts: [first] }));

      expect((await harness.repository.findById('payment-1'))?.receipt).toEqual(second);
    });

    it('lists only the owner’s payments, oldest first', async () => {
      await harness.repository.insert(
        payment({ id: 'newer', createdAt: new Date('2026-06-03T00:00:00.000Z') }),
      );
      await harness.repository.insert(
        payment({ id: 'older', createdAt: new Date('2026-06-02T00:00:00.000Z') }),
      );
      await harness.repository.insert(
        payment({ id: 'other', ownerId: 'owner-2', registrationIds: [] }),
      );

      const listed = await harness.repository.listByOwner('owner-1');

      expect(listed.map((item) => item.id)).toEqual(['older', 'newer']);
    });

    it('lists every active payment across accounts, oldest first', async () => {
      await harness.repository.insert(
        payment({ id: 'newer', createdAt: new Date('2026-06-03T00:00:00.000Z') }),
      );
      await harness.repository.insert(
        payment({
          id: 'older',
          ownerId: 'owner-2',
          registrationIds: [],
          createdAt: new Date('2026-06-02T00:00:00.000Z'),
        }),
      );
      await harness.repository.insert(payment({ id: 'deleted', registrationIds: [] }));
      await harness.repository.softDelete('deleted', 'admin-1');

      const listed = await harness.repository.listAll();

      expect(listed.map((item) => item.id)).toEqual(['older', 'newer']);
    });

    it('does not return a soft-deleted payment', async () => {
      await harness.repository.insert(payment());

      await harness.repository.softDelete('payment-1', 'admin-1');

      expect(await harness.repository.findById('payment-1')).toBeNull();
      expect(await harness.repository.listByOwner('owner-1')).toEqual([]);
    });

    it('keeps a soft-deleted row in storage', async () => {
      await harness.repository.insert(payment());

      await harness.repository.softDelete('payment-1', 'admin-1');

      expect(await harness.isStored('payment-1')).toBe(true);
    });

    it('brings a payment back on restore', async () => {
      await harness.repository.insert(payment());
      await harness.repository.softDelete('payment-1', 'admin-1');

      await harness.repository.restore('payment-1');

      expect(await harness.repository.findById('payment-1')).toEqual(payment());
    });
  });
}
