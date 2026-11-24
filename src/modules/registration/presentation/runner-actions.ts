'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { z } from 'zod';

import {
  accountDirectory,
  appClock,
  appIds,
  changeDistanceFor,
  changeShirtNameFor,
  changeShirtSizeFor,
  getSignedInUser,
  registerAccountRunner,
} from '@/composition';
import { redirect } from '@/i18n/navigation';
import { PRIVACY_VERSION, TERMS_VERSION } from '@/modules/identity';
import type { FormState } from '@/shared/ui/form-state';

const requiredText = (key: string) => z.string({ error: key }).trim().min(1, key);

const runnerSchema = z.object({
  runnerName: requiredText('errors.registration.runner_name_required'),
  distance: z.enum(['3K', '5K'], { error: 'errors.registration.invalid_distance' }),
  shirtSize: z
    .string({ error: 'errors.registration.invalid_shirt_size' })
    .min(1, 'errors.registration.invalid_shirt_size'),
  shirtName: requiredText('errors.registration.shirt_name_required'),
});

const holderSchema = z.object({
  phone: requiredText('errors.required'),
  acceptLegal: z.literal('on', { error: 'errors.acceptLegal' }),
});

const FIELD_BY_ERROR: Readonly<Record<string, string>> = {
  'registration.runner_name_required': 'runnerName',
  'registration.invalid_distance': 'distance',
  'registration.invalid_shirt_size': 'shirtSize',
  'registration.shirt_name_required': 'shirtName',
};

function issuesByField(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) errors[String(issue.path[0])] ??= issue.message;
  return errors;
}

function stateForError(code: string): FormState {
  const key = `errors.${code}`;
  const field = FIELD_BY_ERROR[code];
  return field ? { fieldErrors: { [field]: key } } : { formError: key };
}

async function registerFromForm(data: FormData, isFirstRunner: boolean): Promise<FormState> {
  const locale = await getLocale();
  const user = await getSignedInUser();
  if (!user.ok) return redirect({ href: '/sign-in', locale });

  const input = Object.fromEntries(data.entries());
  const runner = runnerSchema.safeParse(input);
  const holder = isFirstRunner ? holderSchema.safeParse(input) : null;
  if (!runner.success || holder?.success === false) {
    return {
      fieldErrors: {
        ...(runner.success ? {} : issuesByField(runner.error)),
        ...(holder && !holder.success ? issuesByField(holder.error) : {}),
      },
    };
  }

  const userId = user.value.id;
  const registered = await registerAccountRunner({ ownerId: userId, locale, ...runner.data });
  if (!registered.ok) return stateForError(registered.error.code);

  if (holder?.success) {
    const at = appClock.now();
    await accountDirectory.saveProfile({ userId, phone: holder.data.phone, locale, at });
    await accountDirectory.recordLegalAcceptance({
      id: appIds.uuid(),
      userId,
      privacyVersion: PRIVACY_VERSION,
      termsVersion: TERMS_VERSION,
      at,
    });
  }

  const next = data.get('intent') === 'another' ? '/account/runners/new' : '/payment';
  return redirect({ href: next, locale });
}

/**
 * Saves the account's first registration, with the holder's phone and consent.
 *
 * @param _state - The previous form state.
 * @param data - The submitted form.
 * @returns Errors. On success it redirects.
 */
export async function completeRegistrationAction(
  _state: FormState,
  data: FormData,
): Promise<FormState> {
  return registerFromForm(data, true);
}

/**
 * Adds another runner to the account. The holder's earlier consent covers them.
 *
 * @param _state - The previous form state.
 * @param data - The submitted form.
 * @returns Errors. On success it redirects.
 */
export async function addRunnerAction(_state: FormState, data: FormData): Promise<FormState> {
  return registerFromForm(data, false);
}

type EditResult = { ok: true } | { ok: false; error: { code: string } };

async function editOwnRunner(
  data: FormData,
  edit: (runner: { userId: string; registrationId: string }) => Promise<EditResult>,
): Promise<FormState> {
  const user = await getSignedInUser();
  if (!user.ok) return { formError: 'errors.generic' };

  const result = await edit({
    userId: user.value.id,
    registrationId: String(data.get('registrationId') ?? ''),
  });
  if (!result.ok) return stateForError(result.error.code);

  revalidatePath('/[locale]/account', 'page');
  return { done: true };
}

/**
 * Changes the shirt name of one of the account's runners.
 *
 * @param _state - The previous form state.
 * @param data - The submitted form.
 * @returns The done state, or the error.
 */
export async function saveShirtNameAction(_state: FormState, data: FormData): Promise<FormState> {
  const shirtName = String(data.get('shirtName') ?? '');
  return editOwnRunner(data, (runner) => changeShirtNameFor({ ...runner, shirtName }));
}

/**
 * Changes the distance of one of the account's runners.
 *
 * @param _state - The previous form state.
 * @param data - The submitted form.
 * @returns The done state, or the error.
 */
export async function saveDistanceAction(_state: FormState, data: FormData): Promise<FormState> {
  const distance = String(data.get('distance') ?? '');
  return editOwnRunner(data, (runner) => changeDistanceFor({ ...runner, distance }));
}

/**
 * Changes the shirt size of one of the account's runners, before the deadline.
 *
 * @param _state - The previous form state.
 * @param data - The submitted form.
 * @returns The done state, or the error.
 */
export async function saveShirtSizeAction(_state: FormState, data: FormData): Promise<FormState> {
  const shirtSize = String(data.get('shirtSize') ?? '');
  return editOwnRunner(data, (runner) => changeShirtSizeFor({ ...runner, shirtSize }));
}
