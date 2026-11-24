import { describe, expect, it } from 'vitest';

import { firstName } from './person-name';

describe('firstName', () => {
  it('takes the first word of a full name', () => {
    expect(firstName('Sofía Ramírez Ortega')).toBe('Sofía');
  });

  it('ignores surrounding spaces', () => {
    expect(firstName('  Ana  ')).toBe('Ana');
  });

  it('is empty for a blank name', () => {
    expect(firstName('   ')).toBe('');
  });
});
