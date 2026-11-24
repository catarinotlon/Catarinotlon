import { describe, expect, it } from 'vitest';

import { nextStepAfterSignIn } from './next-step';

describe('nextStepAfterSignIn', () => {
  it('sends an account with no registration to complete one', () => {
    expect(nextStepAfterSignIn([])).toBe('register');
  });

  it('sends an account with an unpaid runner to payment', () => {
    expect(nextStepAfterSignIn([{ status: 'confirmed' }, { status: 'pending_payment' }])).toBe(
      'payment',
    );
  });

  it('sends an account whose receipt is in review to the account page', () => {
    expect(nextStepAfterSignIn([{ status: 'payment_in_review' }])).toBe('account');
  });

  it('sends a fully confirmed account to the account page', () => {
    expect(nextStepAfterSignIn([{ status: 'confirmed' }])).toBe('account');
  });
});
