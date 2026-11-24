'use server';

import { revalidatePath } from 'next/cache';

import { addAdmin, getOwnerUser, removeAdmin } from '@/composition';
import type { FormState } from '@/shared/ui/form-state';

const NOT_AUTHORIZED: FormState = { formError: 'errors.generic' };

const text = (data: FormData, name: string) => String(data.get(name) ?? '').trim();
const errorName = (code: string) => code.slice(code.indexOf('.') + 1);

function saved(): FormState {
  revalidatePath('/[locale]/admin', 'layout');
  return { done: true };
}

/**
 * Gives an address access to the admin panel. Only an owner may do it.
 *
 * @param _state - The previous form state.
 * @param data - The submitted form, with `email`.
 * @returns The done state, or an error.
 */
export async function grantAdminAction(_state: FormState, data: FormData): Promise<FormState> {
  const owner = await getOwnerUser();
  if (!owner.ok) return NOT_AUTHORIZED;

  const result = await addAdmin({ ownerId: owner.value.id, email: text(data, 'email') });
  if (result.ok) return saved();
  return { fieldErrors: { email: `admin.team.errors.${errorName(result.error.code)}` } };
}

/**
 * Removes an added admin. Only an owner may do it.
 *
 * @param _state - The previous form state.
 * @param data - The submitted form, with `grantId`.
 * @returns The done state, or an error.
 */
export async function revokeAdminAction(_state: FormState, data: FormData): Promise<FormState> {
  const owner = await getOwnerUser();
  if (!owner.ok) return NOT_AUTHORIZED;

  const result = await removeAdmin({ ownerId: owner.value.id, grantId: text(data, 'grantId') });
  return result.ok ? saved() : { formError: `admin.team.errors.${errorName(result.error.code)}` };
}
