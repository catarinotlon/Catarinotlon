import { describe, expect, it } from 'vitest';

import { whatsappUrl } from './whatsapp-url';

describe('whatsappUrl', () => {
  it('keeps only the digits of the number', () => {
    expect(whatsappUrl('+52 (55) 1234-5678')).toBe('https://wa.me/525512345678');
  });
});
