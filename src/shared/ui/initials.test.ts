import { describe, expect, it } from 'vitest';

import { initials } from './initials';

describe('initials', () => {
  it('uses the first letters of the first two names', () => {
    expect(initials('Sofía Ramírez Ortega')).toBe('SR');
  });

  it('uses one letter for a single name', () => {
    expect(initials('madonna')).toBe('M');
  });

  it('keeps an accented first letter', () => {
    expect(initials('Ángel Ñu')).toBe('ÁÑ');
  });

  it('is empty for a blank name', () => {
    expect(initials('   ')).toBe('');
  });
});
