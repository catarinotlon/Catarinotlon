import { describe, expect, it } from 'vitest';

import { CryptoIdGenerator, CryptoRandomSource, SystemClock } from './system-adapters';

describe('SystemClock', () => {
  it('returns the current time', () => {
    const before = Date.now();

    const now = new SystemClock().now().getTime();

    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });
});

describe('CryptoIdGenerator', () => {
  it('generates distinct version 4 UUIDs', () => {
    const ids = new CryptoIdGenerator();

    const [first, second] = [ids.uuid(), ids.uuid()];

    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(first).not.toBe(second);
  });
});

describe('CryptoRandomSource', () => {
  it('stays in the range the bib number depends on', () => {
    const random = new CryptoRandomSource();

    for (let index = 0; index < 1000; index++) {
      const value = random.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
