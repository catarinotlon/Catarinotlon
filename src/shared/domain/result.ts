/**
 * An expected domain failure, identified by a stable code.
 *
 * @remarks
 * The domain never produces user-facing text. The presentation layer maps each
 * code to a message key.
 */
export interface DomainError<Code extends string = string> {
  /** Stable, namespaced identifier of the failure. */
  readonly code: Code;
}

/**
 * The outcome of an operation that can fail in an expected way.
 *
 * @example
 * ```ts
 * const result = parseDistance('5K');
 * if (result.ok) console.log(result.value);
 * ```
 */
export type Result<T, E extends DomainError = DomainError> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

/**
 * Builds a successful {@link Result}.
 *
 * @param value - The successful value.
 * @returns A result holding `value`.
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Builds a failed {@link Result}.
 *
 * @param code - The domain error code.
 * @returns A result holding the error.
 */
export function err<Code extends string>(code: Code): Result<never, DomainError<Code>> {
  return { ok: false, error: { code } };
}
