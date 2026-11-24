import { beforeEach, describe, expect, it } from 'vitest';

import { createPaymentsKit, receipt } from './payments-test-kit';
import { submitReceipt } from './submit-receipt';

describe('submitReceipt', () => {
  let kit: ReturnType<typeof createPaymentsKit>;

  beforeEach(() => {
    kit = createPaymentsKit();
  });

  const submit = (ownerId = 'user-1') => submitReceipt(kit, { ownerId, receipt });

  it('covers every unpaid registration of the account', async () => {
    await kit.addRegistration({ id: 'a' });
    await kit.addRegistration({ id: 'b' });

    const result = await submit();

    expect(result.ok && result.value.registrationIds).toEqual(['a', 'b']);
  });

  it('charges the fee stored on each registration, not the current price', async () => {
    await kit.addRegistration({ id: 'a', feeCents: 10000 });
    await kit.addRegistration({ id: 'b', feeCents: 15000 });

    const result = await submit();

    expect(result.ok && result.value.amountCents).toBe(25000);
  });

  it('generates the concept from the account holder name', async () => {
    await kit.addRegistration({ id: 'a' });

    const result = await submit();

    expect(result.ok && result.value.concept).toBe('CATARINOTLON - HOLDER ONE');
  });

  it('moves the covered registrations to payment_in_review', async () => {
    await kit.addRegistration({ id: 'a' });

    await submit();

    expect((await kit.registrations.findById('a'))?.status).toBe('payment_in_review');
  });

  it('never confirms anything by itself', async () => {
    await kit.addRegistration({ id: 'a' });

    await submit();

    expect(await kit.tickets.findByRegistration('a')).toBeNull();
  });

  it('leaves confirmed registrations and registrations already in review alone', async () => {
    await kit.addRegistration({ id: 'confirmed', status: 'confirmed' });
    await kit.addRegistration({ id: 'review', status: 'payment_in_review' });
    await kit.addRegistration({ id: 'new' });

    const result = await submit();

    expect(result.ok && result.value.registrationIds).toEqual(['new']);
    expect((await kit.registrations.findById('confirmed'))?.status).toBe('confirmed');
  });

  it('does not cover another account’s registrations', async () => {
    await kit.addRegistration({ id: 'mine' });
    await kit.addRegistration({ id: 'theirs', ownerId: 'user-2' });

    const result = await submit();

    expect(result.ok && result.value.registrationIds).toEqual(['mine']);
    expect((await kit.registrations.findById('theirs'))?.status).toBe('pending_payment');
  });

  it('fails when the account has nothing to pay', async () => {
    await kit.addRegistration({ id: 'a', status: 'confirmed' });

    expect(await submit()).toEqual({ ok: false, error: { code: 'payments.nothing_to_pay' } });
  });

  it('is closed while the fee or the bank data are missing', async () => {
    await kit.addRegistration({ id: 'a' });
    kit.availability.isOpen = async () => false;

    expect(await submit()).toEqual({ ok: false, error: { code: 'payments.closed' } });
    expect((await kit.registrations.findById('a'))?.status).toBe('pending_payment');
  });

  it('sends the account holder a confirmation of receipt', async () => {
    await kit.addRegistration({ id: 'a' });

    await submit();

    expect(kit.emails.sent.filter((email) => email.template === 'receipt_received')).toMatchObject([
      {
        to: 'holder@example.test',
        locale: 'es',
        data: {
          runners: [{ name: 'Runner a', distance: expect.any(String) }],
          amountCents: 10000,
          uploadedAt: receipt.uploadedAt,
        },
      },
    ]);
  });

  it('notifies every admin with the review link and no attachment', async () => {
    await kit.addRegistration({ id: 'a' });

    const result = await submit();

    const adminEmails = kit.emails.sent.filter((email) => email.template === 'admin_new_receipt');
    expect(adminEmails.map((email) => email.to)).toEqual([
      'admin-a@example.test',
      'admin-b@example.test',
    ]);
    expect(adminEmails[0]).toMatchObject({
      data: {
        uploaderName: 'Holder One',
        runners: [{ name: 'Runner a', distance: expect.any(String) }],
        amountCents: 10000,
        concept: 'CATARINOTLON - HOLDER ONE',
        uploadedAt: receipt.uploadedAt,
        reviewUrl: `https://app.test/es/admin/payments/${result.ok ? result.value.id : ''}`,
      },
    });
  });

  it('keeps the payment and reports the error when an email fails', async () => {
    await kit.addRegistration({ id: 'a' });
    const failure = new Error('provider down');
    kit.emails.send = async () => {
      throw failure;
    };

    const result = await submit();

    expect(result.ok).toBe(true);
    expect((await kit.registrations.findById('a'))?.status).toBe('payment_in_review');
    expect(kit.reporter.reports.map((report) => report.error)).toContain(failure);
  });

  it('uses a distinct idempotency key per recipient', async () => {
    await kit.addRegistration({ id: 'a' });

    await submit();

    const keys = kit.emails.sent.map((email) => email.idempotencyKey);
    expect(new Set(keys).size).toBe(3);
  });
});
