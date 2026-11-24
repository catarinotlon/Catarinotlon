import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { medalImagePath } from './medal-image';

const MEDALS = [
  [{ kind: 'finisher', distance: '3K' }, '/images/medals/finisher-3k.webp'],
  [{ kind: 'finisher', distance: '5K' }, '/images/medals/finisher-5k.webp'],
  [{ kind: 'podium', distance: '3K', place: 1 }, '/images/medals/podium-3k-1.webp'],
  [{ kind: 'podium', distance: '3K', place: 2 }, '/images/medals/podium-3k-2.webp'],
  [{ kind: 'podium', distance: '3K', place: 3 }, '/images/medals/podium-3k-3.webp'],
  [{ kind: 'podium', distance: '5K', place: 1 }, '/images/medals/podium-5k-1.webp'],
  [{ kind: 'podium', distance: '5K', place: 2 }, '/images/medals/podium-5k-2.webp'],
  [{ kind: 'podium', distance: '5K', place: 3 }, '/images/medals/podium-5k-3.webp'],
] as const;

describe('medalImagePath', () => {
  it.each(MEDALS)('maps %o to its image', (medal, path) => {
    expect(medalImagePath(medal)).toBe(path);
  });

  it.each(MEDALS)('has the file for %o', (_medal, path) => {
    expect(existsSync(join(process.cwd(), 'public', path))).toBe(true);
  });
});
