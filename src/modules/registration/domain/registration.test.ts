import { describe, expect, it } from 'vitest';

import type { BibNumber } from './bib-number';
import {
  accountStage,
  changeDistance,
  changeShirtName,
  changeShirtSize,
  confirmRegistration,
  createRegistration,
  returnToPendingPayment,
  submitForReview,
  type NewRegistration,
  type Registration,
} from './registration';
import type { ShirtName } from './shirt-name';

const JUNE_1 = new Date('2026-06-01T12:00:00.000Z');
const JUNE_2 = new Date('2026-06-02T12:00:00.000Z');
const JUNE_3 = new Date('2026-06-03T12:00:00.000Z');

const input: NewRegistration = {
  id: 'reg-1',
  ownerId: 'user-1',
  runnerName: 'Runner One',
  distance: '5K',
  shirtSize: 'size-a',
  shirtName: 'ONE' as ShirtName,
  bibNumber: '54321' as BibNumber,
  feeCents: 12345,
  locale: 'es',
  createdAt: JUNE_1,
};

function withStatus(status: Registration['status']): Registration {
  return { ...createRegistration(input), status };
}

describe('createRegistration', () => {
  it('starts in pending_payment', () => {
    expect(createRegistration(input).status).toBe('pending_payment');
  });

  it('stores the fee in force when it was created', () => {
    expect(createRegistration(input).feeCents).toBe(12345);
  });
});

describe('accountStage', () => {
  it('is incomplete when the account has no registrations', () => {
    expect(accountStage([])).toBe('incomplete');
  });

  it('is registered once the account has a registration', () => {
    expect(accountStage([createRegistration(input)])).toBe('registered');
  });
});

describe('submitForReview', () => {
  it('moves pending_payment to payment_in_review', () => {
    const result = submitForReview(withStatus('pending_payment'));

    expect(result.ok && result.value.status).toBe('payment_in_review');
  });

  it('keeps a registration already in review in review, so a receipt can be replaced', () => {
    const result = submitForReview(withStatus('payment_in_review'));

    expect(result.ok && result.value.status).toBe('payment_in_review');
  });

  it('refuses a confirmed registration', () => {
    expect(submitForReview(withStatus('confirmed'))).toEqual({
      ok: false,
      error: { code: 'registration.already_confirmed' },
    });
  });
});

describe('returnToPendingPayment', () => {
  it('moves payment_in_review back to pending_payment', () => {
    const result = returnToPendingPayment(withStatus('payment_in_review'));

    expect(result.ok && result.value.status).toBe('pending_payment');
  });

  it.each(['pending_payment', 'confirmed'] as const)('refuses %s', (status) => {
    expect(returnToPendingPayment(withStatus(status))).toEqual({
      ok: false,
      error: { code: 'registration.not_in_review' },
    });
  });
});

describe('confirmRegistration', () => {
  it('confirms a registration in review', () => {
    const result = confirmRegistration(withStatus('payment_in_review'));

    expect(result.ok && result.value.status).toBe('confirmed');
  });

  it('refuses a registration with no receipt under review', () => {
    expect(confirmRegistration(withStatus('pending_payment'))).toEqual({
      ok: false,
      error: { code: 'registration.not_in_review' },
    });
  });

  it('refuses to confirm twice', () => {
    expect(confirmRegistration(withStatus('confirmed'))).toEqual({
      ok: false,
      error: { code: 'registration.not_in_review' },
    });
  });
});

describe('changeShirtName', () => {
  it('can change after the registration is confirmed', () => {
    const updated = changeShirtName(withStatus('confirmed'), 'NEW' as ShirtName);

    expect(updated.shirtName).toBe('NEW');
  });
});

describe('changeDistance', () => {
  it('can change after paying without touching the stored fee', () => {
    const updated = changeDistance(withStatus('confirmed'), '3K');

    expect(updated).toMatchObject({ distance: '3K', feeCents: 12345, status: 'confirmed' });
  });
});

describe('changeShirtSize', () => {
  const registration = withStatus('confirmed');

  it('allows the change before the deadline', () => {
    const result = changeShirtSize(registration, 'size-b', { now: JUNE_1, deadline: JUNE_2 });

    expect(result.ok && result.value.shirtSize).toBe('size-b');
  });

  it('allows the change at the exact deadline', () => {
    const result = changeShirtSize(registration, 'size-b', { now: JUNE_2, deadline: JUNE_2 });

    expect(result.ok && result.value.shirtSize).toBe('size-b');
  });

  it('refuses the change after the deadline', () => {
    expect(changeShirtSize(registration, 'size-b', { now: JUNE_3, deadline: JUNE_2 })).toEqual({
      ok: false,
      error: { code: 'registration.shirt_size_deadline_passed' },
    });
  });

  it('allows the change while no deadline is configured', () => {
    const result = changeShirtSize(registration, 'size-b', { now: JUNE_3, deadline: null });

    expect(result.ok && result.value.shirtSize).toBe('size-b');
  });

  it('lets an admin change the size after the deadline', () => {
    const result = changeShirtSize(registration, 'size-b', {
      now: JUNE_3,
      deadline: JUNE_2,
      actingAsAdmin: true,
    });

    expect(result.ok && result.value.shirtSize).toBe('size-b');
  });
});
