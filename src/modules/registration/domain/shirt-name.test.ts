import { describe, expect, it } from 'vitest';

import { parseShirtName } from './shirt-name';

describe('parseShirtName', () => {
  it('trims the surrounding whitespace', () => {
    expect(parseShirtName('  Sofi  ')).toEqual({ ok: true, value: 'Sofi' });
  });

  it('keeps accents, symbols, and casing as typed', () => {
    expect(parseShirtName('Peñita <3 ñandú')).toEqual({ ok: true, value: 'Peñita <3 ñandú' });
  });

  it('has no length limit', () => {
    const long = 'A'.repeat(500);

    expect(parseShirtName(long)).toEqual({ ok: true, value: long });
  });

  it.each(['', '   ', '\t\n'])('rejects the blank value %j', (value) => {
    expect(parseShirtName(value)).toEqual({
      ok: false,
      error: { code: 'registration.shirt_name_required' },
    });
  });
});
