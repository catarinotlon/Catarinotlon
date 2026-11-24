import { describe, expect, it } from 'vitest';

import { parseDistance } from './distance';

describe('parseDistance', () => {
  it.each(['3K', '5K'])('accepts %s', (value) => {
    expect(parseDistance(value)).toEqual({ ok: true, value });
  });

  it.each(['10K', '3k', '', ' 5K'])('rejects %j', (value) => {
    expect(parseDistance(value)).toEqual({
      ok: false,
      error: { code: 'registration.invalid_distance' },
    });
  });
});
