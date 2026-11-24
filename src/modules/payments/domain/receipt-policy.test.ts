import { describe, expect, it } from 'vitest';

import { checkReceiptUpload, isOwnReceiptPath, receiptPathPrefix } from './receipt-policy';

const FIVE_MB = 5 * 1024 * 1024;

describe('checkReceiptUpload', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])('accepts %s', (type) => {
    expect(checkReceiptUpload({ contentType: type, sizeBytes: 1000 }, FIVE_MB).ok).toBe(true);
  });

  it.each(['image/svg+xml', 'text/html', 'application/zip', ''])('rejects %j', (contentType) => {
    expect(checkReceiptUpload({ contentType, sizeBytes: 1000 }, FIVE_MB)).toEqual({
      ok: false,
      error: { code: 'payments.receipt_invalid_type' },
    });
  });

  it('accepts a file of exactly the limit', () => {
    const file = { contentType: 'application/pdf', sizeBytes: FIVE_MB };

    expect(checkReceiptUpload(file, FIVE_MB).ok).toBe(true);
  });

  it('rejects a file over the limit', () => {
    const file = { contentType: 'application/pdf', sizeBytes: FIVE_MB + 1 };

    expect(checkReceiptUpload(file, FIVE_MB)).toEqual({
      ok: false,
      error: { code: 'payments.receipt_too_large' },
    });
  });

  it('rejects an empty file', () => {
    const file = { contentType: 'application/pdf', sizeBytes: 0 };

    expect(checkReceiptUpload(file, FIVE_MB)).toEqual({
      ok: false,
      error: { code: 'payments.receipt_empty' },
    });
  });
});

describe('isOwnReceiptPath', () => {
  it('accepts a path under the user’s prefix', () => {
    expect(isOwnReceiptPath(`${receiptPathPrefix('user-1')}file.pdf`, 'user-1')).toBe(true);
  });

  it('rejects another user’s path', () => {
    expect(isOwnReceiptPath(`${receiptPathPrefix('user-2')}file.pdf`, 'user-1')).toBe(false);
  });

  it('rejects a user whose id is a prefix of the owner’s', () => {
    expect(isOwnReceiptPath(`${receiptPathPrefix('user-10')}file.pdf`, 'user-1')).toBe(false);
  });

  it('rejects path traversal', () => {
    expect(isOwnReceiptPath(`${receiptPathPrefix('user-1')}../user-2/file.pdf`, 'user-1')).toBe(
      false,
    );
  });

  it('rejects the bare prefix', () => {
    expect(isOwnReceiptPath(receiptPathPrefix('user-1'), 'user-1')).toBe(false);
  });
});
