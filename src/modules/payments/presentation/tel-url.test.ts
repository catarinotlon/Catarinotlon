import { describe, expect, it } from 'vitest';

import { telUrl } from './tel-url';

describe('telUrl', () => {
  it('keeps only the digits and a leading plus', () => {
    expect(telUrl('+52 (55) 1234-5678')).toBe('tel:+525512345678');
  });

  it('drops a plus that is not at the start', () => {
    expect(telUrl('55 12+34')).toBe('tel:551234');
  });
});
