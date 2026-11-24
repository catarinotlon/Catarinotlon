import { describe, expect, it } from 'vitest';

import {
  confirmPayment,
  createPayment,
  rejectPayment,
  replaceReceipt,
  type NewPayment,
  type Payment,
  type ReceiptFile,
} from './payment';

const JUNE_1 = new Date('2026-06-01T12:00:00.000Z');
const JUNE_2 = new Date('2026-06-02T12:00:00.000Z');

const firstReceipt: ReceiptFile = {
  pathname: 'receipts/first.pdf',
  contentType: 'application/pdf',
  sizeBytes: 1000,
  uploadedAt: JUNE_1,
};

const secondReceipt: ReceiptFile = {
  pathname: 'receipts/second.png',
  contentType: 'image/png',
  sizeBytes: 2000,
  uploadedAt: JUNE_2,
};

const input: NewPayment = {
  id: 'payment-1',
  ownerId: 'user-1',
  concept: 'CATARINOTLON - RUNNER ONE',
  covered: [
    { registrationId: 'reg-1', feeCents: 10000 },
    { registrationId: 'reg-2', feeCents: 10000 },
  ],
  receipt: firstReceipt,
  createdAt: JUNE_1,
};

function created(): Payment {
  const result = createPayment(input);
  if (!result.ok) throw new Error('fixture failed');
  return result.value;
}

describe('createPayment', () => {
  it('starts in review', () => {
    expect(created().status).toBe('in_review');
  });

  it('covers every unpaid registration it was given', () => {
    expect(created().registrationIds).toEqual(['reg-1', 'reg-2']);
  });

  it('adds up the fee stored on each registration', () => {
    const result = createPayment({
      ...input,
      covered: [
        { registrationId: 'reg-1', feeCents: 10000 },
        { registrationId: 'reg-2', feeCents: 15000 },
      ],
    });

    expect(result.ok && result.value.amountCents).toBe(25000);
  });

  it('refuses a payment that covers no registrations', () => {
    expect(createPayment({ ...input, covered: [] })).toEqual({
      ok: false,
      error: { code: 'payments.nothing_to_pay' },
    });
  });
});

describe('replaceReceipt', () => {
  it('makes the new file the current receipt', () => {
    const result = replaceReceipt(created(), secondReceipt);

    expect(result.ok && result.value.receipt).toEqual(secondReceipt);
  });

  it('keeps the replaced file in the history', () => {
    const result = replaceReceipt(created(), secondReceipt);

    expect(result.ok && result.value.previousReceipts).toEqual([firstReceipt]);
  });

  it('refuses once the payment has been reviewed', () => {
    const confirmed = confirmPayment(created(), { reviewerId: 'admin-1', at: JUNE_2 });
    if (!confirmed.ok) throw new Error('fixture failed');

    expect(replaceReceipt(confirmed.value, secondReceipt)).toEqual({
      ok: false,
      error: { code: 'payments.not_in_review' },
    });
  });
});

describe('confirmPayment', () => {
  it('records who confirmed it and when', () => {
    const result = confirmPayment(created(), { reviewerId: 'admin-1', at: JUNE_2 });

    expect(result.ok && result.value).toMatchObject({
      status: 'confirmed',
      reviewedBy: 'admin-1',
      reviewedAt: JUNE_2,
    });
  });

  it('refuses a payment that was already reviewed', () => {
    const first = confirmPayment(created(), { reviewerId: 'admin-1', at: JUNE_2 });
    if (!first.ok) throw new Error('fixture failed');

    expect(confirmPayment(first.value, { reviewerId: 'admin-2', at: JUNE_2 })).toEqual({
      ok: false,
      error: { code: 'payments.not_in_review' },
    });
  });
});

describe('rejectPayment', () => {
  it('records the reason, the reviewer, and the time', () => {
    const result = rejectPayment(created(), {
      reason: '  Amount does not match  ',
      reviewerId: 'admin-1',
      at: JUNE_2,
    });

    expect(result.ok && result.value).toMatchObject({
      status: 'rejected',
      rejectionReason: 'Amount does not match',
      reviewedBy: 'admin-1',
      reviewedAt: JUNE_2,
    });
  });

  it.each(['', '   '])('requires a reason, refusing %j', (reason) => {
    expect(rejectPayment(created(), { reason, reviewerId: 'admin-1', at: JUNE_2 })).toEqual({
      ok: false,
      error: { code: 'payments.rejection_reason_required' },
    });
  });

  it('refuses a payment that was already reviewed', () => {
    const first = rejectPayment(created(), { reason: 'No', reviewerId: 'admin-1', at: JUNE_2 });
    if (!first.ok) throw new Error('fixture failed');

    expect(rejectPayment(first.value, { reason: 'No', reviewerId: 'admin-1', at: JUNE_2 })).toEqual(
      { ok: false, error: { code: 'payments.not_in_review' } },
    );
  });
});
