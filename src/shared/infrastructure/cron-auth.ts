import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (value: string): Buffer => createHash('sha256').update(value).digest();

/**
 * Checks the bearer secret of a scheduled job's request.
 *
 * @remarks
 * Values are compared as fixed-length hashes in constant time. With no secret
 * configured, every request is refused.
 *
 * @param request - The incoming request.
 * @param secret - The configured secret.
 * @returns `true` when the request carries the secret.
 *
 * @example
 * ```ts
 * if (!isAuthorizedCronRequest(request, env.CRON_SECRET)) return notFound;
 * ```
 */
export function isAuthorizedCronRequest(request: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const header = request.headers.get('authorization') ?? '';
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}
