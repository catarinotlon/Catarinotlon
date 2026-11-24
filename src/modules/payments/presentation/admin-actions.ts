'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { z } from 'zod';

import {
  adminEdit,
  adminRegister,
  confirmPayment,
  getAdminUser,
  getEventSettings,
  markKitDelivered,
  rejectPayment,
  saveEventSettings,
  undoKit,
} from '@/composition';
import { redirect } from '@/i18n/navigation';
import { applySettingsSection } from '@/modules/event';
import type { FormState } from '@/shared/ui/form-state';

const NOT_AUTHORIZED: FormState = { formError: 'errors.generic' };

const FIELD_BY_REGISTRATION_ERROR: Readonly<Record<string, string>> = {
  'registration.runner_name_required': 'runnerName',
  'registration.invalid_distance': 'distance',
  'registration.invalid_shirt_size': 'shirtSize',
  'registration.shirt_name_required': 'shirtName',
};

const text = (data: FormData, name: string) => String(data.get(name) ?? '').trim();
const errorName = (code: string) => code.slice(code.indexOf('.') + 1);

const paymentError = (code: string): FormState => ({
  formError: `payment.errors.${errorName(code)}`,
});

const kitError = (code: string): FormState => ({
  formError: `admin.kits.errors.${code.endsWith('not_found') ? 'not_found' : errorName(code)}`,
});

function registrationError(code: string): FormState {
  const key = `errors.${code}`;
  const field = FIELD_BY_REGISTRATION_ERROR[code];
  return field ? { fieldErrors: { [field]: key } } : { formError: key };
}

const runnerFieldsSchema = z.object({
  runnerName: z.string().trim().min(1, 'errors.registration.runner_name_required'),
  distance: z.enum(['3K', '5K'], { error: 'errors.registration.invalid_distance' }),
  shirtSize: z.string().trim().min(1, 'errors.registration.invalid_shirt_size'),
  shirtName: z.string().trim().min(1, 'errors.registration.shirt_name_required'),
});

function readRunnerFields(
  data: FormData,
): { fields: z.infer<typeof runnerFieldsSchema> } | { failure: FormState } {
  const parsed = runnerFieldsSchema.safeParse({
    runnerName: text(data, 'runnerName'),
    distance: text(data, 'distance'),
    shirtSize: text(data, 'shirtSize'),
    shirtName: text(data, 'shirtName'),
  });
  if (parsed.success) return { fields: parsed.data };

  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
  return { failure: { fieldErrors } };
}

function savedAdminData(): FormState {
  revalidatePath('/[locale]/admin', 'layout');
  return { done: true };
}

/**
 * Confirms a payment: its runners are confirmed and their tickets issued.
 *
 * @param _state - The previous form state.
 * @param data - The submitted form.
 * @returns The done state, or an error.
 */
export async function confirmPaymentAction(_state: FormState, data: FormData): Promise<FormState> {
  const admin = await getAdminUser();
  if (!admin.ok) return NOT_AUTHORIZED;

  const result = await confirmPayment({
    paymentId: text(data, 'paymentId'),
    adminId: admin.value.id,
  });
  return result.ok ? savedAdminData() : paymentError(result.error.code);
}

/**
 * Rejects a payment with a reason, which is sent to the account holder.
 *
 * @param _state - The previous form state.
 * @param data - The submitted form.
 * @returns The done state, or an error.
 */
export async function rejectPaymentAction(_state: FormState, data: FormData): Promise<FormState> {
  const admin = await getAdminUser();
  if (!admin.ok) return NOT_AUTHORIZED;

  const reason = text(data, 'reason');
  if (!reason) return { fieldErrors: { reason: 'admin.review.reasonRequired' } };

  const result = await rejectPayment({
    paymentId: text(data, 'paymentId'),
    adminId: admin.value.id,
    reason,
  });
  return result.ok ? savedAdminData() : paymentError(result.error.code);
}

/**
 * Marks a confirmed runner's kit as delivered.
 *
 * @param _state - The previous form state.
 * @param data - The submitted form.
 * @returns The done state, or an error.
 */
export async function deliverKitAction(_state: FormState, data: FormData): Promise<FormState> {
  const admin = await getAdminUser();
  if (!admin.ok) return NOT_AUTHORIZED;

  const collectedBy = text(data, 'collectedBy');
  const result = await markKitDelivered({
    adminId: admin.value.id,
    registrationId: text(data, 'registrationId'),
    ...(collectedBy ? { collectedBy } : {}),
  });
  return result.ok ? savedAdminData() : kitError(result.error.code);
}

/**
 * Undoes a kit delivery, keeping it on record.
 *
 * @param _state - The previous form state.
 * @param data - The submitted form.
 * @returns The done state, or an error.
 */
export async function undoKitAction(_state: FormState, data: FormData): Promise<FormState> {
  const admin = await getAdminUser();
  if (!admin.ok) return NOT_AUTHORIZED;

  const result = await undoKit({
    adminId: admin.value.id,
    registrationId: text(data, 'registrationId'),
  });
  return result.ok ? savedAdminData() : kitError(result.error.code);
}

/**
 * Corrects a registration. Admins are not bound by the shirt-size deadline.
 *
 * @param _state - The previous form state.
 * @param data - The submitted form.
 * @returns The done state, or an error.
 */
export async function editRegistrationAction(
  _state: FormState,
  data: FormData,
): Promise<FormState> {
  const admin = await getAdminUser();
  if (!admin.ok) return NOT_AUTHORIZED;

  const runner = readRunnerFields(data);
  if ('failure' in runner) return runner.failure;

  const result = await adminEdit({
    adminId: admin.value.id,
    registrationId: text(data, 'registrationId'),
    ...runner.fields,
  });
  return result.ok ? savedAdminData() : registrationError(result.error.code);
}

/**
 * Registers someone by hand, optionally with the payment already received.
 *
 * @param _state - The previous form state.
 * @param data - The submitted form.
 * @returns An error. On success it redirects to the registrations list.
 */
export async function createRegistrationAction(
  _state: FormState,
  data: FormData,
): Promise<FormState> {
  const admin = await getAdminUser();
  if (!admin.ok) return NOT_AUTHORIZED;

  const runner = readRunnerFields(data);
  if ('failure' in runner) return runner.failure;

  const locale = await getLocale();
  const result = await adminRegister({
    adminId: admin.value.id,
    ...runner.fields,
    locale,
    contactEmail: text(data, 'contactEmail'),
    contactPhone: text(data, 'contactPhone'),
    paymentReceived: data.get('paymentReceived') === 'on',
  });
  if (!result.ok) return registrationError(result.error.code);

  revalidatePath('/[locale]/admin', 'layout');
  return redirect({ href: '/admin', locale });
}

/**
 * Saves one section of the event settings as a new version.
 *
 * @param _state - The previous form state.
 * @param data - The submitted section.
 * @returns The done state, or an error.
 */
export async function saveSettingsAction(_state: FormState, data: FormData): Promise<FormState> {
  const admin = await getAdminUser();
  if (!admin.ok) return NOT_AUTHORIZED;

  const password = String(data.get('password') ?? '');
  const result = await saveEventSettings({
    adminId: admin.value.id,
    adminName: admin.value.name,
    values: applySettingsSection(await getEventSettings(), data),
    ...(password ? { password } : {}),
  });
  if (!result.ok) return { formError: `admin.settings.errors.${errorName(result.error.code)}` };

  revalidatePath('/', 'layout');
  return { done: true };
}
