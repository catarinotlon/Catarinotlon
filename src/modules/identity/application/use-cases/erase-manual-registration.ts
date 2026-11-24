import { err, ok, type DomainError, type Result } from '@/shared/domain/result';
import type { Clock, IdGenerator } from '@/shared/domain/system-ports';

import type { ManualRegistrationEraser } from '../ports/personal-data-eraser';

/** The registration is unknown, or must be erased through its account. */
export type RegistrationNotErasable = DomainError<'identity.registration_not_erasable'>;

/**
 * Honors an erasure request from someone registered by hand, with no account.
 *
 * @remarks
 * This is irreversible. It is not a soft delete and never issues a `DELETE`.
 * The caller must have verified that `adminId` is an admin.
 *
 * @param deps - The eraser, the clock, and the UUID source.
 * @param input - The admin and the registration to erase.
 * @returns Nothing, or `identity.registration_not_erasable`.
 *
 * @example
 * ```ts
 * await eraseManualRegistration(deps, { adminId, registrationId });
 * ```
 */
export async function eraseManualRegistration(
  deps: {
    readonly eraser: ManualRegistrationEraser;
    readonly clock: Clock;
    readonly ids: IdGenerator;
  },
  input: { readonly adminId: string; readonly registrationId: string },
): Promise<Result<void, RegistrationNotErasable>> {
  const erased = await deps.eraser.eraseManual({
    recordId: deps.ids.uuid(),
    registrationId: input.registrationId,
    performedBy: input.adminId,
    at: deps.clock.now(),
  });
  return erased ? ok(undefined) : err('identity.registration_not_erasable');
}
