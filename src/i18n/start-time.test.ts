import { describe, expect, it } from 'vitest';

import { formatStartTime, formatStartTimeParts } from './start-time';

/** Intl separates the time and the day period with a (narrow) no-break space. */
const plain = (text: string) => text.replace(/[  ]/g, ' ');

describe('formatStartTime', () => {
  it('says whether a Spanish start time is in the morning', () => {
    expect(plain(formatStartTime('07:00', 'es'))).toBe('7:00 a. m.');
  });

  it('says whether a Spanish start time is in the afternoon', () => {
    expect(plain(formatStartTime('19:30', 'es'))).toBe('7:30 p. m.');
  });

  it('uses AM and PM in English', () => {
    expect(plain(formatStartTime('07:00', 'en'))).toBe('7:00 AM');
    expect(plain(formatStartTime('19:30', 'en'))).toBe('7:30 PM');
  });

  it('reads the stored time as Mexico City wall-clock time', () => {
    expect(plain(formatStartTime('00:15', 'en'))).toBe('12:15 AM');
  });
});

describe('formatStartTimeParts', () => {
  it('splits the clock from the half of the day', () => {
    expect(formatStartTimeParts('07:00', 'es')).toEqual({ clock: '7:00', period: 'a. m.' });
    expect(formatStartTimeParts('19:30', 'en')).toEqual({ clock: '7:30', period: 'PM' });
  });
});
