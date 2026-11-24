import { z } from 'zod';

const MIN_PASSWORD_LENGTH = 8;

const required = () => z.string({ error: 'errors.required' }).trim().min(1, 'errors.required');
const email = () =>
  z
    .string({ error: 'errors.invalidEmail' })
    .trim()
    .toLowerCase()
    .pipe(z.email('errors.invalidEmail'));
const newPassword = () =>
  z
    .string({ error: 'errors.passwordTooShort' })
    .min(MIN_PASSWORD_LENGTH, 'errors.passwordTooShort');

/** Account fields of the sign-up form. Errors are message keys. */
export const signUpSchema = z.object({
  name: required(),
  email: email(),
  password: newPassword(),
  phone: required(),
  acceptLegal: z.literal('on', { error: 'errors.acceptLegal' }).transform(() => true),
});

/** The account holder's editable details. */
export const accountDetailsSchema = z.object({ name: required(), phone: required() });

/** The sign-in form. The password is kept exactly as typed. */
export const signInSchema = z.object({
  email: email(),
  password: z.string({ error: 'errors.required' }).min(1, 'errors.required'),
});

/** The forgot-password form. */
export const forgotPasswordSchema = z.object({ email: email() });

/** The reset-password form. */
export const resetPasswordSchema = z
  .object({
    password: newPassword(),
    confirm: z.string({ error: 'errors.required' }).min(1, 'errors.required'),
    token: z.string().min(1, 'errors.invalidResetLink'),
  })
  .refine((value) => value.password === value.confirm, {
    path: ['confirm'],
    error: 'errors.passwordsDontMatch',
  });

/**
 * Converts a validation error to one message key per field.
 *
 * @param error - The Zod error.
 * @returns The first message key of each field.
 *
 * @example
 * ```ts
 * toFieldErrors(result.error); // { email: 'errors.invalidEmail' }
 * ```
 */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? 'form');
    fields[field] ??= issue.message;
  }
  return fields;
}
