import { err, ok, type DomainError, type Result } from '@/shared/domain/result';

const ALLOWED_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

/** The content types a receipt may have. */
export const RECEIPT_CONTENT_TYPES = ALLOWED_TYPES;

/** Expected failures of {@link checkReceiptUpload}. */
export type InvalidReceiptFile =
  | DomainError<'payments.receipt_invalid_type'>
  | DomainError<'payments.receipt_too_large'>
  | DomainError<'payments.receipt_empty'>;

/**
 * Builds the storage prefix of a user's receipts.
 *
 * @param userId - The owner's user ID.
 * @returns The prefix, ending in a slash.
 */
export function receiptPathPrefix(userId: string): string {
  return `receipts/${userId}/`;
}

/**
 * Tells whether a storage path is a file directly under a user's prefix.
 *
 * @remarks
 * The browser reports the path after a direct upload, so it is untrusted. This
 * stops a user from attaching a file that belongs to someone else.
 *
 * @param pathname - The reported path.
 * @param userId - The signed-in user.
 * @returns `true` when the path belongs to the user.
 */
export function isOwnReceiptPath(pathname: string, userId: string): boolean {
  const prefix = receiptPathPrefix(userId);
  if (!pathname.startsWith(prefix)) return false;
  const file = pathname.slice(prefix.length);
  return file.length > 0 && !file.includes('/') && !file.includes('..');
}

/**
 * Validates a receipt's type and size.
 *
 * @param file - The file's content type and size.
 * @param maxBytes - The configured size limit.
 * @returns Nothing, or the reason the file is not acceptable.
 *
 * @example
 * ```ts
 * checkReceiptUpload({ contentType: 'application/pdf', sizeBytes: 1000 }, limit);
 * ```
 */
export function checkReceiptUpload(
  file: { readonly contentType: string; readonly sizeBytes: number },
  maxBytes: number,
): Result<void, InvalidReceiptFile> {
  if (!ALLOWED_TYPES.includes(file.contentType)) return err('payments.receipt_invalid_type');
  if (file.sizeBytes <= 0) return err('payments.receipt_empty');
  if (file.sizeBytes > maxBytes) return err('payments.receipt_too_large');
  return ok(undefined);
}
