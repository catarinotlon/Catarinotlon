import { describe, expect, it } from 'vitest';

import { parseClabe } from './clabe';

describe('parseClabe', () => {
  it('accepts 18 digits with a correct check digit', () => {
    expect(parseClabe('002010077777777771')).toEqual({ ok: true, value: '002010077777777771' });
  });

  it('accepts a CLABE whose check digit computes to zero', () => {
    expect(parseClabe('000000000000000000')).toEqual({ ok: true, value: '000000000000000000' });
  });

  it('rejects a wrong check digit', () => {
    expect(parseClabe('002010077777777772')).toEqual({
      ok: false,
      error: { code: 'payments.invalid_clabe' },
    });
  });

  it.each(['00201007777777777', '0020100777777777711', '00201007777777777a', ''])(
    'rejects the malformed value %j',
    (value) => {
      expect(parseClabe(value)).toEqual({
        ok: false,
        error: { code: 'payments.invalid_clabe' },
      });
    },
  );
});
