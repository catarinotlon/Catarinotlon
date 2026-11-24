'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect as externalRedirect } from 'next/navigation'; // eslint-disable-line no-restricted-imports -- Google's URL is external, so it cannot be localized.
import { getLocale } from 'next-intl/server';
import { z } from 'zod';

import {
  accountDirectory,
  accounts,
  appClock,
  appIds,
  getEventSettings,
  getSignedInUser,
  listRunners,
  registerAccountRunner,
  secureCookies,
} from '@/composition';
import { getPathname, redirect } from '@/i18n/navigation';
import { isPaymentOpen } from '@/modules/event';
import { nextStepAfterSignIn } from '@/modules/registration';
import type { FormState } from '@/shared/ui/form-state';

import {
  accountDetailsSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  toFieldErrors,
} from './auth-schemas';
import { PENDING_EMAIL_COOKIE, PRIVACY_VERSION, TERMS_VERSION } from './legal-versions';

const PENDING_EMAIL_MAX_AGE_SECONDS = 3600;

const firstRaceSchema = z.object({
  distance: z.enum(['3K', '5K'], { error: 'errors.registration.invalid_distance' }),
  shirtSize: z
    .string({ error: 'errors.registration.invalid_shirt_size' })
    .min(1, 'errors.registration.invalid_shirt_size'),
  shirtName: z
    .string({ error: 'errors.registration.shirt_name_required' })
    .trim()
    .min(1, 'errors.registration.shirt_name_required'),
});

const AFTER_SIGN_IN = {
  register: '/register',
  payment: '/payment',
  account: '/account',
} as const;

const formValues = (data: FormData) => Object.fromEntries(data.entries());

const verifiedLanding = (locale: 'es' | 'en') =>
  `${getPathname({ href: '/verify-email', locale })}?verified=1`;

/**
 * Creates an account and, while registration is open, registers its first runner.
 *
 * @remarks
 * The answer is the same when the email already has an account, so sign-up cannot
 * reveal who is registered.
 *
 * @param _state - The previous form state.
 * @param data - The submitted form.
 * @returns Field errors. On success it redirects to the "confirm your email" page.
 */
export async function signUpAction(_state: FormState, data: FormData): Promise<FormState> {
  const locale = (await getLocale()) as 'es' | 'en';
  const values = formValues(data);
  const settings = await getEventSettings();
  const registrationOpen = isPaymentOpen(settings) && settings.shirtSizes.length > 0;

  const account = signUpSchema.safeParse(values);
  const race = registrationOpen ? firstRaceSchema.safeParse(values) : null;
  const sizeOnOffer = !race?.success || settings.shirtSizes.includes(race.data.shirtSize);
  if (!account.success || race?.success === false || !sizeOnOffer) {
    return {
      fieldErrors: {
        ...(account.success ? {} : toFieldErrors(account.error)),
        ...(race && !race.success ? toFieldErrors(race.error) : {}),
        ...(sizeOnOffer ? {} : { shirtSize: 'errors.registration.invalid_shirt_size' }),
      },
    };
  }

  const { name, email, password, phone } = account.data;
  const { userId } = await accounts.signUp({
    name,
    email,
    password,
    callbackURL: verifiedLanding(locale),
  });

  if (userId) {
    const at = appClock.now();
    await accountDirectory.saveProfile({ userId, phone, locale, at });
    await accountDirectory.recordLegalAcceptance({
      id: appIds.uuid(),
      userId,
      privacyVersion: PRIVACY_VERSION,
      termsVersion: TERMS_VERSION,
      at,
    });
    if (race?.success) {
      await registerAccountRunner({ ownerId: userId, runnerName: name, locale, ...race.data });
    }
  }

  (await cookies()).set(PENDING_EMAIL_COOKIE, email, {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookies,
    maxAge: PENDING_EMAIL_MAX_AGE_SECONDS,
    path: '/',
  });

  return redirect({ href: '/verify-email', locale });
}

/**
 * Signs in and continues to the account's next step.
 *
 * @param _state - The previous form state.
 * @param data - The submitted form.
 * @returns Errors. On success it redirects.
 */
export async function signInAction(_state: FormState, data: FormData): Promise<FormState> {
  const locale = await getLocale();
  const credentials = signInSchema.safeParse(formValues(data));
  if (!credentials.success) return { fieldErrors: toFieldErrors(credentials.error) };

  const result = await accounts.signIn(credentials.data);
  if (!result.ok) {
    const unverified = result.error.code === 'identity.email_not_verified';
    return { formError: unverified ? 'errors.emailNotVerified' : 'errors.invalidCredentials' };
  }

  const runners = await listRunners(result.value.userId);
  return redirect({ href: AFTER_SIGN_IN[nextStepAfterSignIn(runners)], locale });
}

/**
 * Requests a password reset. The answer is the same for any email.
 *
 * @param _state - The previous form state.
 * @param data - The submitted form.
 * @returns The done state, or a format error.
 */
export async function forgotPasswordAction(_state: FormState, data: FormData): Promise<FormState> {
  const locale = await getLocale();
  const request = forgotPasswordSchema.safeParse(formValues(data));
  if (!request.success) return { fieldErrors: toFieldErrors(request.error) };

  await accounts.requestPasswordReset(
    request.data.email,
    getPathname({ href: '/reset-password', locale }),
  );
  return { done: true };
}

/**
 * Sets a new password from a reset link.
 *
 * @param _state - The previous form state.
 * @param data - The submitted form.
 * @returns Errors. On success it redirects to sign-in.
 */
export async function resetPasswordAction(_state: FormState, data: FormData): Promise<FormState> {
  const locale = await getLocale();
  const reset = resetPasswordSchema.safeParse(formValues(data));
  if (!reset.success) return { fieldErrors: toFieldErrors(reset.error) };

  const result = await accounts.resetPassword({
    token: reset.data.token,
    password: reset.data.password,
  });
  if (!result.ok) return { formError: 'errors.invalidResetLink' };

  return redirect({ href: '/sign-in', locale });
}

/**
 * Sends the verification email again to the address that just signed up.
 *
 * @param _state - The previous form state.
 * @returns The done state.
 */
export async function resendVerificationAction(_state: FormState): Promise<FormState> {
  const locale = (await getLocale()) as 'es' | 'en';
  const email = (await cookies()).get(PENDING_EMAIL_COOKIE)?.value;
  if (email) await accounts.resendVerification(email, verifiedLanding(locale));
  return { done: true };
}

/**
 * Saves the account holder's name and phone.
 *
 * @param _state - The previous form state.
 * @param data - The submitted form.
 * @returns The done state, or the errors.
 */
export async function saveAccountAction(_state: FormState, data: FormData): Promise<FormState> {
  const locale = await getLocale();
  const user = await getSignedInUser();
  if (!user.ok) return { formError: 'errors.generic' };

  const details = accountDetailsSchema.safeParse(formValues(data));
  if (!details.success) return { fieldErrors: toFieldErrors(details.error) };

  await accountDirectory.updateDetails({
    userId: user.value.id,
    ...details.data,
    locale,
    at: appClock.now(),
  });
  revalidatePath('/[locale]/account', 'page');
  return { done: true };
}

/** Starts the Google sign-in flow. */
export async function googleSignInAction(): Promise<void> {
  const locale = await getLocale();
  const url = await accounts.googleSignInUrl(getPathname({ href: '/account', locale }));
  if (url) externalRedirect(url);
}

/** Ends the session and returns to the landing page. */
export async function signOutAction(): Promise<void> {
  const locale = await getLocale();
  await accounts.signOut();
  redirect({ href: '/', locale });
}
