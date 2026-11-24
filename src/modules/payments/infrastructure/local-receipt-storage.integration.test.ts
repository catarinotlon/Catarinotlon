import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LocalReceiptStorage } from './local-receipt-storage';

const PATH = 'receipts/user-1/file.pdf';

describe('LocalReceiptStorage', () => {
  let directory: string;
  let storage: LocalReceiptStorage;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'catarinotlon-receipts-'));
    storage = new LocalReceiptStorage(directory);
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('reads back what it stored', async () => {
    await storage.write(PATH, 'application/pdf', new TextEncoder().encode('%PDF-test'));

    const file = await storage.read(PATH);

    expect(file?.contentType).toBe('application/pdf');
    expect(await new Response(file?.stream).text()).toBe('%PDF-test');
  });

  it('reports the stored size and type', async () => {
    await storage.write(PATH, 'application/pdf', new Uint8Array(12));

    expect(await storage.stat(PATH)).toEqual({ contentType: 'application/pdf', sizeBytes: 12 });
  });

  it('returns null for a missing file', async () => {
    expect(await storage.read('receipts/user-1/missing.pdf')).toBeNull();
    expect(await storage.stat('receipts/user-1/missing.pdf')).toBeNull();
  });

  it('refuses a path that escapes the storage directory', async () => {
    await expect(
      storage.write('../outside.pdf', 'application/pdf', new Uint8Array(1)),
    ).rejects.toThrow();
    expect(await storage.read('../outside.pdf')).toBeNull();
  });
});
