import { describe, expect, it } from 'vitest';

import { reminderDaysLeft } from './race-reminder';

describe('reminderDaysLeft', () => {
  it('sends the first reminder three days before the race', () => {
    expect(reminderDaysLeft('2026-12-19', '2026-12-16')).toBe(3);
  });

  it('sends the last reminder the day before the race', () => {
    expect(reminderDaysLeft('2026-12-19', '2026-12-18')).toBe(1);
  });

  it.each(['2026-12-15', '2026-12-17', '2026-12-19', '2026-12-20'])(
    'sends nothing on %s',
    (today) => {
      expect(reminderDaysLeft('2026-12-19', today)).toBeNull();
    },
  );

  it('counts across the end of a month', () => {
    expect(reminderDaysLeft('2026-12-01', '2026-11-28')).toBe(3);
  });

  it('sends nothing while the race has no date', () => {
    expect(reminderDaysLeft(null, '2026-12-16')).toBeNull();
  });
});
