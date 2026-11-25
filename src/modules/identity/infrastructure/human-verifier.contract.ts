import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { HumanVerifier } from '../application/ports/human-verifier';

/** What each adapter must supply to run the shared contract. */
export interface HumanVerifierHarness {
  /** The adapter under test. */
  readonly verifier: HumanVerifier;
  /** Returns a fresh token, as a browser gets after a person solves the challenge. */
  humanToken(): string;
  /** Releases the adapter's resources. */
  cleanup(): void;
}

/**
 * Runs the shared {@link HumanVerifier} contract against an adapter.
 *
 * @param name - The adapter's name.
 * @param createHarness - Builds a fresh harness for each test.
 */
export function describeHumanVerifierContract(
  name: string,
  createHarness: () => HumanVerifierHarness,
): void {
  describe(`HumanVerifier contract: ${name}`, () => {
    let harness: HumanVerifierHarness;

    beforeEach(() => {
      harness = createHarness();
    });

    afterEach(() => {
      harness.cleanup();
    });

    it('passes a token a person earned', async () => {
      expect(await harness.verifier.verify(harness.humanToken())).toBe(true);
    });

    it('refuses a form that sent no token', async () => {
      expect(await harness.verifier.verify(null)).toBe(false);
    });

    it('refuses an empty token', async () => {
      expect(await harness.verifier.verify('')).toBe(false);
    });

    it('refuses a token nobody earned', async () => {
      expect(await harness.verifier.verify('forged-token')).toBe(false);
    });

    it('refuses a token that was already spent', async () => {
      const token = harness.humanToken();
      await harness.verifier.verify(token);

      expect(await harness.verifier.verify(token)).toBe(false);
    });
  });
}
