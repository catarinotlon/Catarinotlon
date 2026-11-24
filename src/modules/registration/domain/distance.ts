import { err, ok, type DomainError, type Result } from '@/shared/domain/result';

/** The race distances offered by the event. */
export const DISTANCES = ['3K', '5K'] as const;

/** A valid race distance. */
export type Distance = (typeof DISTANCES)[number];

/** Error returned when a value is not a race distance. */
export type InvalidDistance = DomainError<'registration.invalid_distance'>;

/**
 * Validates a race distance.
 *
 * @param value - The raw value.
 * @returns The distance, or `registration.invalid_distance`.
 *
 * @example
 * ```ts
 * parseDistance('5K'); // { ok: true, value: '5K' }
 * ```
 */
export function parseDistance(value: string): Result<Distance, InvalidDistance> {
  const distance = DISTANCES.find((candidate) => candidate === value);
  return distance ? ok(distance) : err('registration.invalid_distance');
}
