import { describe, expect, it } from 'vitest';

import { shirtNameWidthRatio } from './shirt-print';

describe('shirtNameWidthRatio', () => {
  it('prints a short name at the largest size', () => {
    expect(shirtNameWidthRatio('SOFI')).toBe(0.116);
  });

  it('scales a long name down so it fits across the back', () => {
    expect(shirtNameWidthRatio('A'.repeat(20))).toBeCloseTo(0.047);
  });

  it('treats an empty name as a single letter', () => {
    expect(shirtNameWidthRatio('')).toBe(0.116);
  });
});
