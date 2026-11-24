import type { Clock, IdGenerator } from '@/shared/domain/system-ports';

import type { PersonalDataEraser } from '../ports/personal-data-eraser';

/**
 * Honors an erasure request by anonymizing the account in place.
 *
 * @remarks
 * This is irreversible. It is not a soft delete and never issues a `DELETE`.
 * The caller must have verified that `adminId` is an admin.
 *
 * @param deps - The eraser, the clock, and the UUID source.
 * @param input - The admin and the account to erase.
 *
 * @example
 * ```ts
 * await eraseAccountData(deps, { adminId, userId });
 * ```
 */
export async function eraseAccountData(
  deps: {
    readonly eraser: PersonalDataEraser;
    readonly clock: Clock;
    readonly ids: IdGenerator;
  },
  input: { readonly adminId: string; readonly userId: string },
): Promise<void> {
  await deps.eraser.erase({
    recordId: deps.ids.uuid(),
    userId: input.userId,
    performedBy: input.adminId,
    at: deps.clock.now(),
  });
}
