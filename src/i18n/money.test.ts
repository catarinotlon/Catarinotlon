import { describe, expect, it } from 'vitest';

import { formatMoney } from './money';

describe('formatMoney', () => {
  it.each([
    ['es', 12345, '$123.45'],
    ['en', 12345, '$123.45'],
    ['es', 100000, '$1,000.00'],
  ])('formats in %s: %d cents as %s', (locale, cents, expected) => {
    expect(formatMoney(cents, locale)).toBe(expected);
  });
});
