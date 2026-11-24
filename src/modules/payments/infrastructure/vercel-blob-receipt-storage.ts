import type {
  ReceiptStorage,
  StoredReceipt,
  StoredReceiptInfo,
} from '../application/ports/receipt-storage';

/** The part of the `@vercel/blob` API this adapter uses. */
export interface BlobClient {
  /**
   * Opens a blob.
   *
   * @param pathname - The blob's path.
   * @param options - The access mode.
   * @returns The blob, or `null` when missing.
   */
  get(
    pathname: string,
    options: { access: 'private' },
  ): Promise<{
    statusCode: number;
    stream: ReadableStream<Uint8Array> | null;
    blob: { contentType: string | null; size: number | null };
  } | null>;
}

/** {@link ReceiptStorage} adapter backed by a private Vercel Blob store. */
export class VercelBlobReceiptStorage implements ReceiptStorage {
  /**
   * Creates the storage.
   *
   * @param client - The Blob client.
   */
  constructor(private readonly client: BlobClient) {}

  async stat(pathname: string): Promise<StoredReceiptInfo | null> {
    const file = await this.read(pathname);
    if (!file) return null;
    await file.stream.cancel();
    return { contentType: file.contentType, sizeBytes: file.sizeBytes };
  }

  async read(pathname: string): Promise<StoredReceipt | null> {
    const result = await this.client.get(pathname, { access: 'private' });
    if (result?.statusCode !== 200 || !result.stream) return null;
    return {
      stream: result.stream,
      contentType: result.blob.contentType ?? 'application/octet-stream',
      sizeBytes: result.blob.size ?? 0,
    };
  }
}
