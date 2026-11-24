import { describe, expect, it } from 'vitest';

import {
  createRegistration,
  type BibNumber,
  type Registration,
  type ShirtName,
} from '@/modules/registration';
import type { KitPickup } from '@/modules/ticketing';

import type { Payment } from '../../domain/payment';
import { adminTotals, buildAdminRows, filterAdminRows, type AdminRow } from './admin-overview';

const NOW = new Date('2026-06-01T12:00:00.000Z');

const registration = (id: string, overrides: Partial<Registration> = {}): Registration => ({
  ...createRegistration({
    id,
    ownerId: 'owner',
    runnerName: `Runner ${id}`,
    distance: '5K',
    shirtSize: 'size-a',
    shirtName: 'NAME' as ShirtName,
    bibNumber: '12345' as BibNumber,
    feeCents: 10000,
    locale: 'es',
    createdAt: NOW,
  }),
  ...overrides,
});

const payment = (overrides: Partial<Payment>): Payment => ({
  id: 'payment-1',
  ownerId: 'owner',
  concept: 'CONCEPT',
  status: 'in_review',
  registrationIds: ['a'],
  amountCents: 10000,
  receipt: { pathname: 'p', contentType: 'application/pdf', sizeBytes: 1, uploadedAt: NOW },
  previousReceipts: [],
  reviewedBy: null,
  reviewedAt: null,
  rejectionReason: null,
  createdAt: NOW,
  ...overrides,
});

const pickup: KitPickup = {
  id: 'pickup-1',
  registrationId: 'a',
  deliveredBy: 'admin',
  deliveredAt: NOW,
  collectedBy: null,
  undoneBy: null,
  undoneAt: null,
};

const emails = new Map([['owner', 'owner@example.test']]);

describe('buildAdminRows', () => {
  it('uses the account’s email', () => {
    const [row] = buildAdminRows([registration('a')], emails, [], []);

    expect(row?.email).toBe('owner@example.test');
  });

  it('uses the contact email of a registration with no account', () => {
    const [row] = buildAdminRows(
      [registration('a', { ownerId: null, contactEmail: 'walkin@example.test' })],
      emails,
      [],
      [],
    );

    expect(row?.email).toBe('walkin@example.test');
  });

  it.each([
    ['confirmed', 'paid'],
    ['payment_in_review', 'in_review'],
    ['pending_payment', 'pending'],
  ] as const)('maps %s to the payment state %s', (status, expected) => {
    const [row] = buildAdminRows([registration('a', { status })], emails, [], []);

    expect(row?.paymentState).toBe(expected);
  });

  it('links a runner in review to the payment to review', () => {
    const [row] = buildAdminRows(
      [registration('a', { status: 'payment_in_review' })],
      emails,
      [payment({ status: 'rejected', id: 'old' }), payment({ id: 'current' })],
      [],
    );

    expect(row?.reviewPaymentId).toBe('current');
  });

  it('has nothing to review for a runner not in review', () => {
    const [row] = buildAdminRows([registration('a')], emails, [payment({})], []);

    expect(row?.reviewPaymentId).toBeNull();
  });

  it('shows whether the kit was delivered', () => {
    const [delivered, waiting] = buildAdminRows(
      [registration('a'), registration('b')],
      emails,
      [],
      [pickup],
    );

    expect(delivered?.kitDelivered).toBe(true);
    expect(waiting?.kitDelivered).toBe(false);
  });
});

describe('filterAdminRows', () => {
  const rows: AdminRow[] = buildAdminRows(
    [
      registration('a', {
        runnerName: 'Sofía Ramírez',
        bibNumber: '48213' as BibNumber,
        status: 'confirmed',
      }),
      registration('b', {
        runnerName: 'Mateo Cruz',
        distance: '3K',
        bibNumber: '51234' as BibNumber,
        ownerId: null,
        contactEmail: 'mateo@example.test',
      }),
    ],
    emails,
    [],
    [pickup],
  );
  const ids = (filter: Parameters<typeof filterAdminRows>[1]) =>
    filterAdminRows(rows, filter).map((row) => row.id);

  it('matches a name ignoring accents', () => {
    expect(ids({ query: 'sofia' })).toEqual(['a']);
  });

  it('matches an email', () => {
    expect(ids({ query: 'mateo@example' })).toEqual(['b']);
  });

  it('matches a bib number', () => {
    expect(ids({ query: '51234' })).toEqual(['b']);
  });

  it('filters by distance', () => {
    expect(ids({ distance: '3K' })).toEqual(['b']);
  });

  it('filters by payment state', () => {
    expect(ids({ payment: 'paid' })).toEqual(['a']);
  });

  it('filters by kit state', () => {
    expect(ids({ kit: 'delivered' })).toEqual(['a']);
    expect(ids({ kit: 'waiting' })).toEqual(['b']);
  });
});

describe('adminTotals', () => {
  it('counts runners by distance, payment state, and kit', () => {
    const rows = buildAdminRows(
      [
        registration('a', { status: 'confirmed' }),
        registration('b', { status: 'payment_in_review', distance: '3K' }),
        registration('c'),
      ],
      emails,
      [],
      [pickup],
    );

    expect(adminTotals(rows)).toEqual({
      total: 3,
      three: 1,
      five: 2,
      inReview: 1,
      pending: 1,
      kitsDelivered: 1,
    });
  });
});
