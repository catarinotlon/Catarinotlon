import { beforeEach, describe, expect, it } from 'vitest';

import { confirmPaymentReview, rejectPaymentReview } from './review-payment';
import { createPaymentsKit, NOW, receipt } from './payments-test-kit';
import { submitReceipt } from './submit-receipt';

describe('payment review', () => {
  let kit: ReturnType<typeof createPaymentsKit>;
  let paymentId: string;

  beforeEach(async () => {
    kit = createPaymentsKit();
    await kit.addRegistration({ id: 'a' });
    await kit.addRegistration({ id: 'b' });
    const submitted = await submitReceipt(kit, { ownerId: 'user-1', receipt });
    if (!submitted.ok) throw new Error('fixture failed');
    paymentId = submitted.value.id;
    kit.emails.sent.length = 0;
  });

  describe('confirmPaymentReview', () => {
    const confirm = () => confirmPaymentReview(kit, { paymentId, adminId: 'admin-1' });

    it('confirms every registration in the payment', async () => {
      await confirm();

      expect((await kit.registrations.findById('a'))?.status).toBe('confirmed');
      expect((await kit.registrations.findById('b'))?.status).toBe('confirmed');
    });

    it('issues exactly one ticket per registration', async () => {
      await confirm();

      const first = await kit.tickets.findByRegistration('a');
      const second = await kit.tickets.findByRegistration('b');
      expect(first?.issuedAt).toEqual(NOW);
      expect(second).not.toBeNull();
      expect(first?.id).not.toBe(second?.id);
    });

    it('records who reviewed the payment', async () => {
      await confirm();

      expect(await kit.payments.findById(paymentId)).toMatchObject({
        status: 'confirmed',
        reviewedBy: 'admin-1',
        reviewedAt: NOW,
      });
    });

    it('sends one confirmation per runner with a link to the ticket PDF', async () => {
      await confirm();

      const ticket = await kit.tickets.findByRegistration('a');
      const emails = kit.emails.sent.filter((email) => email.template === 'registration_confirmed');
      expect(emails).toHaveLength(2);
      expect(emails[0]).toMatchObject({
        to: 'holder@example.test',
        data: {
          runnerName: 'Runner a',
          shirtSize: 'size-a',
          accountUrl: 'https://app.test/es/account',
          ticketId: ticket?.id,
          ticketPdfUrl: `https://app.test/es/tickets/${ticket?.id}.pdf`,
        },
      });
    });

    it('refuses to confirm twice, so no second ticket is issued', async () => {
      await confirm();

      expect(await confirm()).toEqual({ ok: false, error: { code: 'payments.not_in_review' } });
    });

    it('fails for an unknown payment', async () => {
      const result = await confirmPaymentReview(kit, { paymentId: 'missing', adminId: 'admin-1' });

      expect(result).toEqual({ ok: false, error: { code: 'payments.not_found' } });
    });

    it('leaves a later payment from the same account untouched', async () => {
      await kit.addRegistration({ id: 'later' });
      const later = await submitReceipt(kit, { ownerId: 'user-1', receipt });
      if (!later.ok) throw new Error('fixture failed');

      await confirm();

      expect((await kit.registrations.findById('later'))?.status).toBe('payment_in_review');
      expect((await kit.payments.findById(later.value.id))?.status).toBe('in_review');
    });
  });

  describe('rejectPaymentReview', () => {
    const reject = (reason = 'Amount does not match') =>
      rejectPaymentReview(kit, { paymentId, adminId: 'admin-1', reason });

    it('returns every registration to pending_payment', async () => {
      await reject();

      expect((await kit.registrations.findById('a'))?.status).toBe('pending_payment');
      expect((await kit.registrations.findById('b'))?.status).toBe('pending_payment');
    });

    it('keeps each registration’s bib number', async () => {
      const before = await kit.registrations.findById('a');

      await reject();

      expect((await kit.registrations.findById('a'))?.bibNumber).toBe(before?.bibNumber);
    });

    it('issues no ticket', async () => {
      await reject();

      expect(await kit.tickets.findByRegistration('a')).toBeNull();
    });

    it('stores the reason and the reviewer', async () => {
      await reject();

      expect(await kit.payments.findById(paymentId)).toMatchObject({
        status: 'rejected',
        rejectionReason: 'Amount does not match',
        reviewedBy: 'admin-1',
      });
    });

    it('emails the reason and an upload link to the account holder', async () => {
      await reject();

      expect(kit.emails.sent).toMatchObject([
        {
          template: 'receipt_rejected',
          to: 'holder@example.test',
          data: {
            reason: 'Amount does not match',
            uploadUrl: 'https://app.test/es/payment',
          },
        },
      ]);
    });

    it('requires a reason and changes nothing without one', async () => {
      expect(await reject('   ')).toEqual({
        ok: false,
        error: { code: 'payments.rejection_reason_required' },
      });
      expect((await kit.registrations.findById('a'))?.status).toBe('payment_in_review');
      expect(kit.emails.sent).toEqual([]);
    });

    it('lets the account pay again after a rejection', async () => {
      await reject();

      const again = await submitReceipt(kit, { ownerId: 'user-1', receipt });

      expect(again.ok && again.value.registrationIds).toEqual(['a', 'b']);
    });
  });
});
