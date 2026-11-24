import { beforeEach, describe, expect, it } from 'vitest';

import { createPaymentsKit, NOW, receipt } from './payments-test-kit';
import { authorizeReceiptRead, replacePaymentReceipt } from './receipt-access';
import { confirmPaymentReview } from './review-payment';
import { submitReceipt } from './submit-receipt';

const newReceipt = {
  pathname: 'receipts/second.png',
  contentType: 'image/png',
  sizeBytes: 2000,
  uploadedAt: NOW,
};

describe('receipt access', () => {
  let kit: ReturnType<typeof createPaymentsKit>;
  let paymentId: string;

  beforeEach(async () => {
    kit = createPaymentsKit();
    await kit.addRegistration({ id: 'a' });
    const submitted = await submitReceipt(kit, { ownerId: 'user-1', receipt });
    if (!submitted.ok) throw new Error('fixture failed');
    paymentId = submitted.value.id;
    kit.emails.sent.length = 0;
  });

  describe('replacePaymentReceipt', () => {
    const replace = (userId = 'user-1') =>
      replacePaymentReceipt(kit, { userId, paymentId, receipt: newReceipt });

    it('makes the new file current and keeps the old one', async () => {
      await replace();

      expect(await kit.payments.findById(paymentId)).toMatchObject({
        receipt: newReceipt,
        previousReceipts: [receipt],
      });
    });

    it('notifies the holder and every admin about the new file', async () => {
      await replace();

      expect(kit.emails.sent.map((email) => email.template).sort()).toEqual([
        'admin_new_receipt',
        'admin_new_receipt',
        'receipt_received',
      ]);
    });

    it('treats another account’s payment as not found', async () => {
      expect(await replace('intruder')).toEqual({
        ok: false,
        error: { code: 'payments.not_found' },
      });
      expect((await kit.payments.findById(paymentId))?.receipt).toEqual(receipt);
    });

    it('refuses once the payment has been reviewed', async () => {
      await confirmPaymentReview(kit, { paymentId, adminId: 'admin-1' });

      expect(await replace()).toEqual({ ok: false, error: { code: 'payments.not_in_review' } });
    });
  });

  describe('authorizeReceiptRead', () => {
    const read = (userId: string, isAdmin: boolean, pathname = receipt.pathname) =>
      authorizeReceiptRead(kit, { userId, isAdmin, paymentId, pathname });

    it('lets the owner read their receipt', async () => {
      expect(await read('user-1', false)).toEqual({
        ok: true,
        value: { pathname: receipt.pathname, contentType: receipt.contentType },
      });
    });

    it('lets an admin read any receipt', async () => {
      expect((await read('admin-1', true)).ok).toBe(true);
    });

    it('hides the receipt from anyone else', async () => {
      expect(await read('intruder', false)).toEqual({
        ok: false,
        error: { code: 'payments.not_found' },
      });
    });

    it('can read a replaced receipt', async () => {
      await replacePaymentReceipt(kit, { userId: 'user-1', paymentId, receipt: newReceipt });

      expect((await read('user-1', false, receipt.pathname)).ok).toBe(true);
    });

    it('refuses a path that does not belong to the payment', async () => {
      expect(await read('user-1', false, 'receipts/someone-else.pdf')).toEqual({
        ok: false,
        error: { code: 'payments.not_found' },
      });
    });
  });
});
