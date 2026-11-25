import type { HumanVerifier } from '../application/ports/human-verifier';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 10_000;

/** Error codes that mean the visitor's token does not prove a person. */
const VISITOR_FAILURES = new Set([
  'missing-input-response',
  'invalid-input-response',
  'timeout-or-duplicate',
]);

interface SiteverifyAnswer {
  readonly success: boolean;
  readonly 'error-codes'?: readonly string[];
}

/** Options of {@link CloudflareTurnstileVerifier}. */
export interface CloudflareTurnstileOptions {
  /** The widget's secret key, from the Cloudflare dashboard. */
  readonly secretKey: string;
}

/**
 * {@link HumanVerifier} backed by Cloudflare Turnstile's siteverify API.
 *
 * @remarks
 * Only the secret and the token are sent: no IP address and no form data. A bad
 * or spent token is the visitor's failure and returns `false`; a wrong secret or
 * an unreachable service is ours and throws, so it is reported instead of
 * telling a person they look like a bot.
 */
export class CloudflareTurnstileVerifier implements HumanVerifier {
  /**
   * Creates the adapter.
   *
   * @param options - The secret key.
   */
  constructor(private readonly options: CloudflareTurnstileOptions) {}

  /**
   * Validates a token with Cloudflare. The token is spent by the check.
   *
   * @param token - The `cf-turnstile-response` the form sent, or `null`.
   * @returns `true` when Cloudflare confirms the token.
   * @throws When Cloudflare cannot answer or rejects the secret key.
   */
  async verify(token: string | null): Promise<boolean> {
    if (!token) return false;

    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: this.options.secretKey, response: token }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Turnstile siteverify answered ${response.status}`);

    const answer = (await response.json()) as SiteverifyAnswer;
    if (answer.success) return true;

    const codes = answer['error-codes'] ?? [];
    if (codes.length > 0 && codes.every((code) => VISITOR_FAILURES.has(code))) return false;
    throw new Error(`Turnstile siteverify failed: ${codes.join(', ') || 'no error code'}`);
  }
}
