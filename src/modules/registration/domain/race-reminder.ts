const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_DAYS = [3, 1] as const;

/** How many days before the race a reminder goes out. */
export type ReminderDaysLeft = (typeof REMINDER_DAYS)[number];

/**
 * Whether today is a reminder day, and which one.
 *
 * @remarks
 * Runners get one reminder three days before the race and one the day
 * before. Kit pickup happens on race day, so there is no separate kit
 * reminder: both emails carry the pickup details.
 *
 * @param eventDate - The race day, `YYYY-MM-DD`, or `null` while it is not set.
 * @param today - Today's date in the event's time zone, `YYYY-MM-DD`.
 * @returns `3` or `1` on a reminder day, otherwise `null`.
 * @example
 * reminderDaysLeft('2026-12-19', '2026-12-16'); // 3
 */
export function reminderDaysLeft(eventDate: string | null, today: string): ReminderDaysLeft | null {
  if (!eventDate) return null;
  const days = Math.round(
    (Date.parse(`${eventDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS,
  );
  return REMINDER_DAYS.find((value) => value === days) ?? null;
}
