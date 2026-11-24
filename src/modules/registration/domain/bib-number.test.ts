import { describe, expect, it } from 'vitest';

import { bibNumberFromRandom, parseBibNumber } from './bib-number';

describe('parseBibNumber', () => {
  it.each(['10000', '54321', '99999'])('accepts %s', (value) => {
    expect(parseBibNumber(value)).toEqual({ ok: true, value });
  });

  it.each(['9999', '100000', '09999', '1234a', ''])('rejects %j', (value) => {
    expect(parseBibNumber(value)).toEqual({
      ok: false,
      error: { code: 'registration.invalid_bib_number' },
    });
  });
});

describe('bibNumberFromRandom', () => {
  it.each([
    [0, '10000'],
    [0.5, '55000'],
    [0.999999, '99999'],
  ])('maps the random value %d to %s', (random, expected) => {
    expect(bibNumberFromRandom(random)).toBe(expected);
  });
});
