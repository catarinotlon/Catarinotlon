import { describe, expect, it } from 'vitest';

import {
  createRegistration,
  type BibNumber,
  type Registration,
  type ShirtName,
} from '@/modules/registration';
import type { Ticket } from '@/modules/ticketing';

import type { Payment } from '../../domain/payment';
import { buildAccountOverview, buildPaymentSummary } from './account-overview';

const at = (day: number) => new Date(Date.UTC(2026, 5, day));

const runner = (id: string, status: Registration['status'], feeCents = 10000): Registration => ({
  ...createRegistration({
    id,
    ownerId: 'owner',
    runnerName: `Runner ${id}`,
    distance: '5K',
    shirtSize: 'size-a',
    shirtName: 'NAME' as ShirtName,
    bibNumber: '12345' as BibNumber,
    feeCents,
    locale: 'es',
    createdAt: at(1),
  }),
  status,
});

const payment = (overrides: Partial<Payment>): Payment => ({
  id: 'payment-1',
  ownerId: 'owner',
  concept: 'CATARINOTLON - OWNER',
  status: 'in_review',
  registrationIds: ['a'],
  amountCents: 10000,
  receipt: {
    pathname: 'receipts/owner/file.pdf',
    contentType: 'application/pdf',
    sizeBytes: 100,
    uploadedAt: at(2),
  },
  previousReceipts: [],
  reviewedBy: null,
  reviewedAt: null,
  rejectionReason: null,
  createdAt: at(2),
  ...overrides,
});

const ticket: Ticket = { id: 'ticket-a', registrationId: 'a', issuedAt: at(3) };

describe('buildAccountOverview', () => {
  it('shows a confirmed runner with its ticket', () => {
    const [panel] = buildAccountOverview([runner('a', 'confirmed')], [], [ticket]);

    expect(panel).toMatchObject({ stage: 'confirmed', ticket, rejectionReason: null });
  });

  it('shows an unpaid runner as pending, with no ticket', () => {
    const [panel] = buildAccountOverview([runner('a', 'pending_payment')], [], []);

    expect(panel).toMatchObject({ stage: 'pending_payment', ticket: null, payment: null });
  });

  it('shows the payment under review', () => {
    const inReview = payment({});

    const [panel] = buildAccountOverview([runner('a', 'payment_in_review')], [inReview], []);

    expect(panel).toMatchObject({ stage: 'payment_in_review', payment: inReview });
  });

  it('shows the admin’s reason when the latest receipt was rejected', () => {
    const rejected = payment({ status: 'rejected', rejectionReason: 'Wrong amount' });

    const [panel] = buildAccountOverview([runner('a', 'pending_payment')], [rejected], []);

    expect(panel).toMatchObject({ stage: 'receipt_rejected', rejectionReason: 'Wrong amount' });
  });

  it('uses the newest payment when a runner was rejected and paid again', () => {
    const rejected = payment({
      id: 'old',
      status: 'rejected',
      rejectionReason: 'No',
      createdAt: at(2),
    });
    const again = payment({ id: 'new', status: 'in_review', createdAt: at(4) });

    const [panel] = buildAccountOverview([runner('a', 'payment_in_review')], [again, rejected], []);

    expect(panel).toMatchObject({ stage: 'payment_in_review', rejectionReason: null });
    expect(panel?.payment?.id).toBe('new');
  });

  it('never mixes the data of two runners', () => {
    const covering = payment({ registrationIds: ['b'] });

    const [first, second] = buildAccountOverview(
      [runner('a', 'confirmed'), runner('b', 'payment_in_review')],
      [covering],
      [ticket],
    );

    expect(first).toMatchObject({ payment: null, ticket });
    expect(second).toMatchObject({ payment: covering, ticket: null });
  });
});

describe('buildPaymentSummary', () => {
  it('lists only the unpaid runners and adds up their stored fees', () => {
    const summary = buildPaymentSummary(
      [
        runner('a', 'pending_payment', 10000),
        runner('b', 'pending_payment', 15000),
        runner('c', 'confirmed', 10000),
        runner('d', 'payment_in_review', 10000),
      ],
      'Holder Name',
    );

    expect(summary.runners.map((item) => item.id)).toEqual(['a', 'b']);
    expect(summary.totalCents).toBe(25000);
  });

  it('generates the concept from the account holder', () => {
    expect(buildPaymentSummary([], 'Sofía Ramírez').concept).toBe('CATARINOTLON - SOFIA RAMIREZ');
  });

  it('is zero when nothing is unpaid', () => {
    expect(buildPaymentSummary([runner('a', 'confirmed')], 'Holder').totalCents).toBe(0);
  });
});
