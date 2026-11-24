import { APIError } from 'better-auth/api';

import { err, ok, type DomainError, type Result } from '@/shared/domain/result';
import type { AppAuth } from '@/shared/infrastructure/auth/create-auth';

/** Expected failures of signing in. */
export type SignInError =
  DomainError<'identity.invalid_credentials'> | DomainError<'identity.email_not_verified'>;
/** Expected failure of resetting a password. */
export type ResetPasswordError = DomainError<'identity.invalid_reset_link'>;

const errorCode = (error: unknown): string | undefined =>
  error instanceof APIError ? (error.body as { code?: string } | undefined)?.code : undefined;

/**
 * Account operations backed by Better Auth.
 *
 * @remarks
 * Library errors are translated to domain codes here, so nothing above this
 * adapter depends on Better Auth.
 */
export class BetterAuthAccounts {
  /**
   * Creates the adapter.
   *
   * @param auth - The Better Auth instance.
   * @param getHeaders - Reads the current request's headers.
   */
  constructor(
    private readonly auth: AppAuth,
    private readonly getHeaders: () => Promise<Headers>,
  ) {}

  /**
   * Creates an account and sends its verification email.
   *
   * @remarks
   * When the email already has an account, Better Auth answers as if it had
   * succeeded so sign-up cannot be used to discover who is registered. That
   * answer carries an ID that was never stored, so it is reported as `null`
   * and the caller must not create anything for it.
   *
   * @param input - The name, email, password, and where the email link lands.
   * @returns The new user's ID, or `null` when no account was created.
   */
  async signUp(input: {
    readonly name: string;
    readonly email: string;
    readonly password: string;
    readonly callbackURL?: string;
  }): Promise<{ userId: string | null }> {
    const { user } = await this.auth.api.signUpEmail({
      body: {
        name: input.name,
        email: input.email,
        password: input.password,
        ...(input.callbackURL ? { callbackURL: input.callbackURL } : {}),
      },
      headers: await this.getHeaders(),
    });
    const context = await this.auth.$context;
    const stored = await context.internalAdapter.findUserById(user.id);
    return { userId: stored ? user.id : null };
  }

  /**
   * Signs in with email and password.
   *
   * @param input - The email and password.
   * @returns The user's ID, or the reason it failed.
   */
  async signIn(input: {
    readonly email: string;
    readonly password: string;
  }): Promise<Result<{ userId: string }, SignInError>> {
    try {
      const { user } = await this.auth.api.signInEmail({
        body: { email: input.email, password: input.password },
        headers: await this.getHeaders(),
      });
      return ok({ userId: user.id });
    } catch (error) {
      const code = errorCode(error);
      if (code === 'EMAIL_NOT_VERIFIED') return err('identity.email_not_verified');
      if (code === 'INVALID_EMAIL_OR_PASSWORD') return err('identity.invalid_credentials');
      throw error;
    }
  }

  /**
   * Sets a new password from a reset link.
   *
   * @param input - The token and the new password.
   * @returns Nothing, or `identity.invalid_reset_link`.
   */
  async resetPassword(input: {
    readonly token: string;
    readonly password: string;
  }): Promise<Result<void, ResetPasswordError>> {
    try {
      await this.auth.api.resetPassword({
        body: { token: input.token, newPassword: input.password },
        headers: await this.getHeaders(),
      });
      return ok(undefined);
    } catch (error) {
      if (errorCode(error) === 'INVALID_TOKEN') return err('identity.invalid_reset_link');
      throw error;
    }
  }

  /**
   * Sends a reset link, without revealing whether the email has an account.
   *
   * @param email - The address.
   * @param redirectTo - The page that receives the token.
   */
  async requestPasswordReset(email: string, redirectTo: string): Promise<void> {
    await this.auth.api.requestPasswordReset({
      body: { email, redirectTo },
      headers: await this.getHeaders(),
    });
  }

  /**
   * Sends the verification email again.
   *
   * @param email - The address.
   * @param callbackURL - Where the link lands after verifying.
   */
  async resendVerification(email: string, callbackURL: string): Promise<void> {
    await this.auth.api.sendVerificationEmail({
      body: { email, callbackURL },
      headers: await this.getHeaders(),
    });
  }

  /** Ends the current session. */
  async signOut(): Promise<void> {
    await this.auth.api.signOut({ headers: await this.getHeaders() });
  }

  /**
   * Starts the Google sign-in flow.
   *
   * @param callbackURL - Where Google sign-in lands afterwards.
   * @returns The URL to redirect the browser to.
   */
  async googleSignInUrl(callbackURL: string): Promise<string | null> {
    const result = await this.auth.api.signInSocial({
      body: { provider: 'google', callbackURL },
      headers: await this.getHeaders(),
    });
    return result.url ?? null;
  }

  /**
   * Tells how an account signs in.
   *
   * @param userId - The user's ID.
   * @returns `password` when it has a credential, otherwise `google`.
   */
  async signInMethod(userId: string): Promise<'google' | 'password'> {
    const context = await this.auth.$context;
    const accounts = await context.internalAdapter.findAccounts(userId);
    return accounts.some((item) => item.providerId === 'credential') ? 'password' : 'google';
  }

  /**
   * Re-checks a user's password before a sensitive change.
   *
   * @param userId - The user's ID.
   * @param password - The password they entered.
   * @returns `true` when it is correct.
   */
  async verify(userId: string, password: string): Promise<boolean> {
    const context = await this.auth.$context;
    const accounts = await context.internalAdapter.findAccounts(userId);
    const hash = accounts.find((item) => item.providerId === 'credential')?.password;
    if (!hash) return false;
    return context.password.verify({ hash, password });
  }
}
