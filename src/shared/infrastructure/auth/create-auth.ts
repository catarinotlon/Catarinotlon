import { createHash } from 'node:crypto';

import { getCurrentAuthContext } from '@better-auth/core/context';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';

import { sendAfterCommit, type EmailSender } from '@/shared/domain/email';
import type { ErrorReporter } from '@/shared/domain/error-reporter';

import type { AppDatabase } from '../db/database-client';
import * as schema from '../db/schema';

const ONE_HOUR_SECONDS = 3600;

/** Dependencies of {@link createAuth}. */
export interface CreateAuthOptions {
  /** The database. */
  readonly db: AppDatabase;
  /** Sender of the verification and reset emails. */
  readonly emails: EmailSender;
  /** Reporter of unexpected errors. */
  readonly reporter: ErrorReporter;
  /** The signing secret. */
  readonly secret: string;
  /** The app's public URL. */
  readonly baseURL: string;
  /** Google OAuth credentials. */
  readonly google: { readonly clientId: string; readonly clientSecret: string };
  /** Runs email delivery outside the response, so timing reveals nothing. */
  readonly defer?: (task: () => Promise<void>) => void;
}

async function localeFrom(request: Request | undefined): Promise<string> {
  const headers = request?.headers ?? (await currentEndpointHeaders());
  const cookie = headers?.get('cookie') ?? '';
  return /(?:^|;\s*)NEXT_LOCALE=en(?:;|$)/.test(cookie) ? 'en' : 'es';
}

async function currentEndpointHeaders(): Promise<Headers | undefined> {
  try {
    return (await getCurrentAuthContext()).headers;
  } catch {
    return undefined;
  }
}

const tokenKey = (token: string): string => createHash('sha256').update(token).digest('hex');

/**
 * Creates the Better Auth instance.
 *
 * @remarks
 * Email and password require a verified address. Account deletion stays disabled.
 * Email sign-up, email sign-in, the password reset request, and the verification
 * resend are closed over HTTP: they only run from the forms' server actions, which
 * check that a person submitted the form.
 *
 * @param options - The database, email ports, secrets, and URLs.
 * @returns The auth instance.
 */
export function createAuth(options: CreateAuthOptions) {
  const defer = options.defer ?? ((task: () => Promise<void>) => void task());
  const ports = { emails: options.emails, reporter: options.reporter };

  return betterAuth({
    secret: options.secret,
    baseURL: options.baseURL,
    /** The Drizzle adapter over the app's database. */
    database: drizzleAdapter(options.db, { provider: 'sqlite', schema }),
    advanced: { database: { generateId: 'uuid' } },
    user: { deleteUser: { enabled: false } },
    // These run only through the forms' server actions, which check for a person first.
    disabledPaths: [
      '/sign-up/email',
      '/sign-in/email',
      '/request-password-reset',
      '/send-verification-email',
    ],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      resetPasswordTokenExpiresIn: ONE_HOUR_SECONDS,
      /** Sends the reset link through the email port. */
      sendResetPassword: async ({ user, url, token }, request) => {
        const locale = await localeFrom(request);
        defer(() =>
          sendAfterCommit(ports, {
            template: 'reset_password',
            to: user.email,
            locale,
            idempotencyKey: `reset_password:${tokenKey(token)}`,
            data: { name: user.name, url },
          }),
        );
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: ONE_HOUR_SECONDS,
      /** Sends the verification link through the email port. */
      sendVerificationEmail: async ({ user, url, token }, request) => {
        const locale = await localeFrom(request);
        defer(() =>
          sendAfterCommit(ports, {
            template: 'verify_email',
            to: user.email,
            locale,
            idempotencyKey: `verify_email:${tokenKey(token)}`,
            data: { name: user.name, url },
          }),
        );
      },
    },
    socialProviders: {
      google: {
        clientId: options.google.clientId,
        clientSecret: options.google.clientSecret,
      },
    },
    plugins: [nextCookies()],
  });
}

/** The configured auth instance. */
export type AppAuth = ReturnType<typeof createAuth>;
