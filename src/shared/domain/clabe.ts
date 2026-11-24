import { err, ok, type DomainError, type Result } from './result';

const WEIGHTS = [3, 7, 1] as const;

declare const clabeBrand: unique symbol;

/** An 18-digit Mexican interbank account number with a valid check digit. */
export type Clabe = string & { readonly [clabeBrand]: true };

/** Error returned when a value is not a valid CLABE. */
export type InvalidClabe = DomainError<'payments.invalid_clabe'>;

/**
 * Validates a CLABE, including its check digit.
 *
 * @remarks
 * Each of the first 17 digits is multiplied by the repeating weights 3, 7, 1.
 * The check digit is `(10 - (sum of the products mod 10)) mod 10`.
 *
 * @param value - The raw value.
 * @returns The CLABE, or `payments.invalid_clabe`.
 *
 * @example
 * ```ts
 * parseClabe('002010077777777771'); // { ok: true, value: '002010077777777771' }
 * ```
 */
export function parseClabe(value: string): Result<Clabe, InvalidClabe> {
  if (!/^\d{18}$/.test(value)) return err('payments.invalid_clabe');

  const digits = [...value].map(Number);
  const sum = digits
    .slice(0, 17)
    .reduce((total, digit, index) => total + digit * (WEIGHTS[index % WEIGHTS.length] ?? 0), 0);
  const expected = (10 - (sum % 10)) % 10;

  return digits[17] === expected ? ok(value as Clabe) : err('payments.invalid_clabe');
}
