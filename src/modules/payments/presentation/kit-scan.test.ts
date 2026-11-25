import { describe, expect, it } from 'vitest';

import { createRepeatGuard, isTicketCode, kitVerdict } from './kit-scan';

describe('isTicketCode', () => {
  it('accepts the UUID a ticket QR carries', () => {
    expect(isTicketCode('e640f3cb-4711-40eb-8ff6-e9f9a3d4bb19')).toBe(true);
  });

  it('accepts it with surrounding spaces or in capitals', () => {
    expect(isTicketCode(' E640F3CB-4711-40EB-8FF6-E9F9A3D4BB19 ')).toBe(true);
  });

  it('rejects anything else, such as a link', () => {
    expect(isTicketCode('https://example.com/e640f3cb-4711-40eb-8ff6-e9f9a3d4bb19')).toBe(false);
    expect(isTicketCode('48213')).toBe(false);
    expect(isTicketCode('')).toBe(false);
  });
});

describe('kitVerdict', () => {
  const runner = { paymentState: 'paid', kitDelivered: false } as const;

  it('says to deliver a paid runner whose kit is pending', () => {
    expect(kitVerdict(runner)).toBe('ready');
  });

  it('says a delivered kit was already delivered', () => {
    expect(kitVerdict({ ...runner, kitDelivered: true })).toBe('delivered');
  });

  it('says not to deliver while the payment is not confirmed', () => {
    expect(kitVerdict({ ...runner, paymentState: 'in_review' })).toBe('unpaid');
    expect(kitVerdict({ ...runner, paymentState: 'pending' })).toBe('unpaid');
  });
});

describe('createRepeatGuard', () => {
  it('lets a code through the first time', () => {
    const accept = createRepeatGuard(3000);
    expect(accept('a', 0)).toBe(true);
  });

  it('ignores the same code within the window', () => {
    const accept = createRepeatGuard(3000);
    accept('a', 0);
    expect(accept('a', 2999)).toBe(false);
  });

  it('lets the same code through again once the window has passed', () => {
    const accept = createRepeatGuard(3000);
    accept('a', 0);
    expect(accept('a', 3000)).toBe(true);
  });

  it('lets a different code through at once', () => {
    const accept = createRepeatGuard(3000);
    accept('a', 0);
    expect(accept('b', 10)).toBe(true);
  });
});
