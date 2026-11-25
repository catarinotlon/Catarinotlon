import type { HumanVerifier } from '../application/ports/human-verifier';

/**
 * In-memory {@link HumanVerifier} for tests: it passes only the tokens it issued,
 * each one once.
 *
 * @example
 * ```ts
 * const humans = new InMemoryHumanVerifier();
 * await humans.verify(humans.issue()); // true
 * ```
 */
export class InMemoryHumanVerifier implements HumanVerifier {
  private readonly unspent = new Set<string>();
  private issued = 0;

  /**
   * Issues a token, as the challenge does after a person solves it.
   *
   * @returns The token.
   */
  issue(): string {
    const token = `human-token-${++this.issued}`;
    this.unspent.add(token);
    return token;
  }

  /**
   * Checks and spends a token.
   *
   * @param token - The token, or `null`.
   * @returns `true` when the token was issued and not spent yet.
   */
  async verify(token: string | null): Promise<boolean> {
    if (!token || !this.unspent.has(token)) return false;
    this.unspent.delete(token);
    return true;
  }
}
