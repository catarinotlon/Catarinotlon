import { createFormatter, type DateTimeFormatOptions, type Locale } from 'next-intl';

/**
 * The format for a date with its time, always on a 12-hour clock.
 *
 * @remarks
 * Spanish would otherwise use a 24-hour clock; the app always says whether a time
 * is in the morning or the afternoon: `15 ene 2026, 12:00 p. m.`.
 */
export const DATE_AND_TIME_FORMAT: DateTimeFormatOptions = {
  dateStyle: 'medium',
  timeStyle: 'short',
  hourCycle: 'h12',
};

/** Mexico City has stayed on UTC-6 all year since 2022. */
const MEXICO_CITY_UTC_OFFSET_HOURS = 6;

/**
 * Formats a race start time so nobody has to guess the half of the day.
 *
 * @remarks
 * Start times are stored as Mexico City wall-clock `HH:mm`. They are shown on a
 * 12-hour clock with the day period: `7:00 a. m.` in Spanish, `7:00 AM` in English.
 *
 * @param time - The start time, `HH:mm` in Mexico City.
 * @param locale - The app locale.
 * @returns The formatted time, such as `7:00 a. m.`.
 *
 * @example
 * ```ts
 * formatStartTime('07:00', 'es'); // '7:00 a. m.'
 * ```
 */
export function formatStartTime(time: string, locale: string): string {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  const format = createFormatter({ locale: locale as Locale, timeZone: 'America/Mexico_City' });
  return format.dateTime(
    new Date(Date.UTC(2026, 0, 1, hours + MEXICO_CITY_UTC_OFFSET_HOURS, minutes)),
    { hour: 'numeric', minute: '2-digit', hourCycle: 'h12' },
  );
}

/**
 * Formats a race start time as its clock and its half of the day, so each can be styled.
 *
 * @param time - The start time, `HH:mm` in Mexico City.
 * @param locale - The app locale.
 * @returns The clock, such as `7:00`, and the day period, such as `a. m.`, with plain spaces.
 *
 * @example
 * ```ts
 * formatStartTimeParts('07:00', 'es'); // { clock: '7:00', period: 'a. m.' }
 * ```
 */
export function formatStartTimeParts(
  time: string,
  locale: string,
): { clock: string; period: string } {
  const [clock = '', ...rest] = formatStartTime(time, locale).split(/[\s  ]+/u);
  return { clock, period: rest.join(' ') };
}
