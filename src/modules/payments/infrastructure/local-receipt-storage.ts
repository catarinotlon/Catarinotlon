import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

import type {
  ReceiptStorage,
  StoredReceipt,
  StoredReceiptInfo,
} from '../application/ports/receipt-storage';

/**
 * {@link ReceiptStorage} on the local disk, for E2E runs and local development.
 *
 * @remarks
 * Production uses the private Vercel Blob store.
 */
export class LocalReceiptStorage implements ReceiptStorage {
  private readonly root: string;

  /**
   * Creates the storage.
   *
   * @param directory - The directory that holds the files.
   */
  constructor(directory: string) {
    this.root = resolve(directory);
  }

  /**
   * Stores a file.
   *
   * @param pathname - The file's path in the store.
   * @param contentType - The file's MIME type.
   * @param bytes - The file's content.
   * @throws {Error} When the path escapes the storage directory.
   */
  async write(pathname: string, contentType: string, bytes: Uint8Array): Promise<void> {
    const target = this.locate(pathname);
    if (!target) throw new Error('Invalid receipt path');

    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes);
    await writeFile(`${target}.meta.json`, JSON.stringify({ contentType }));
  }

  async stat(pathname: string): Promise<StoredReceiptInfo | null> {
    const file = await this.load(pathname);
    return file ? { contentType: file.contentType, sizeBytes: file.bytes.byteLength } : null;
  }

  async read(pathname: string): Promise<StoredReceipt | null> {
    const file = await this.load(pathname);
    if (!file) return null;
    return {
      contentType: file.contentType,
      sizeBytes: file.bytes.byteLength,
      stream: new Blob([new Uint8Array(file.bytes)]).stream(),
    };
  }

  private locate(pathname: string): string | null {
    const target = resolve(this.root, pathname);
    return target.startsWith(`${this.root}${sep}`) ? target : null;
  }

  private async load(pathname: string) {
    const target = this.locate(pathname);
    if (!target) return null;
    try {
      const [bytes, meta] = await Promise.all([
        readFile(target),
        readFile(`${target}.meta.json`, 'utf8'),
      ]);
      return { bytes, contentType: (JSON.parse(meta) as { contentType: string }).contentType };
    } catch {
      return null;
    }
  }
}
