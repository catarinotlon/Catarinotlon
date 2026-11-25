/**
 * Tells whether a form was submitted by a person rather than a bot.
 *
 * @remarks
 * The browser solves a challenge and sends its token with the form. A token
 * proves one submission only: once checked, it is spent. A missing token never
 * passes.
 *
 * @example
 * ```ts
 * if (!(await humans.verify(token))) return { formError: 'errors.humanCheckFailed' };
 * ```
 */
export interface HumanVerifier {
  /**
   * Checks a challenge token.
   *
   * @param token - The token the browser sent, or `null` when it sent none.
   * @returns `true` only when the token proves a person submitted the form.
   * @throws When the check itself cannot run (for example, the service is unreachable).
   */
  verify(token: string | null): Promise<boolean>;
}
