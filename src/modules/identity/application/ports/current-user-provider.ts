/** The signed-in user, as the application sees it. */
export interface CurrentUser {
  /** The user's UUID. */
  readonly id: string;
  /** The account holder's full name. */
  readonly name: string;
  /** The account's email address. */
  readonly email: string;
  /** Whether the address has been verified. */
  readonly emailVerified: boolean;
}

/**
 * Resolves who is making the current request.
 *
 * @example
 * ```ts
 * const user = await currentUser.current();
 * ```
 */
export interface CurrentUserProvider {
  /**
   * Reads the current user.
   *
   * @returns The user, or `null` for a signed-out visitor.
   */
  current(): Promise<CurrentUser | null>;
}
