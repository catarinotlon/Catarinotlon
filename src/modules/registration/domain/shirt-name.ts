import { err, ok, type DomainError, type Result } from '@/shared/domain/result';

declare const shirtNameBrand: unique symbol;

/** The name printed on the back of a runner's shirt. */
export type ShirtName = string & { readonly [shirtNameBrand]: true };

/** Error returned when the shirt name is blank. */
export type ShirtNameRequired = DomainError<'registration.shirt_name_required'>;

/**
 * Validates a shirt name.
 *
 * @remarks
 * The name has no length limit, character rules, or approval step. It is
 * untrusted text and must be escaped wherever it is rendered.
 *
 * @param value - The raw value.
 * @returns The trimmed name, or `registration.shirt_name_required` when blank.
 *
 * @example
 * ```ts
 * parseShirtName('  Sofi '); // { ok: true, value: 'Sofi' }
 * ```
 */
export function parseShirtName(value: string): Result<ShirtName, ShirtNameRequired> {
  const trimmed = value.trim();
  return trimmed ? ok(trimmed as ShirtName) : err('registration.shirt_name_required');
}
