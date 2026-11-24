import { err, ok, type DomainError, type Result } from '@/shared/domain/result';

const MIN_BIB = 10000;
const BIB_RANGE = 90000;

declare const bibNumberBrand: unique symbol;

/**
 * A runner's 5-digit bib number, from `10000` to `99999`.
 *
 * @remarks
 * It is not an identifier. It is unique, and it is never reassigned or recycled.
 */
export type BibNumber = string & { readonly [bibNumberBrand]: true };

/** Error returned when a value is not a bib number. */
export type InvalidBibNumber = DomainError<'registration.invalid_bib_number'>;

/**
 * Validates a bib number.
 *
 * @param value - The raw value.
 * @returns The bib number, or `registration.invalid_bib_number`.
 *
 * @example
 * ```ts
 * parseBibNumber('54321'); // { ok: true, value: '54321' }
 * ```
 */
export function parseBibNumber(value: string): Result<BibNumber, InvalidBibNumber> {
  return /^[1-9]\d{4}$/.test(value)
    ? ok(value as BibNumber)
    : err('registration.invalid_bib_number');
}

/**
 * Maps a random value to a bib number.
 *
 * @param random - A number in the range `[0, 1)`, supplied by a port.
 * @returns A bib number in the valid range.
 *
 * @example
 * ```ts
 * bibNumberFromRandom(0.5); // '55000'
 * ```
 */
export function bibNumberFromRandom(random: number): BibNumber {
  return String(MIN_BIB + Math.floor(random * BIB_RANGE)) as BibNumber;
}
