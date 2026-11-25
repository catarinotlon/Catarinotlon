import { describe, expect, it } from 'vitest';

import { toHexColor } from './hex-color';

describe('toHexColor', () => {
  it('expands the short hex a CSS minifier writes', () => {
    expect(toHexColor('#fff')).toBe('#ffffff');
  });

  it('keeps a full hex, in lowercase', () => {
    expect(toHexColor(' #0E0E0F ')).toBe('#0e0e0f');
  });

  it('converts the rgb() form a browser computes', () => {
    expect(toHexColor('rgb(14, 14, 15)')).toBe('#0e0e0f');
  });

  it('returns nothing for a value it cannot read', () => {
    expect(toHexColor('')).toBeUndefined();
    expect(toHexColor('var(--x)')).toBeUndefined();
  });
});
