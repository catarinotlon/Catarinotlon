/** A stored receipt's metadata, as reported by the store. */
export interface StoredReceiptInfo {
  /** The file's MIME type. */
  readonly contentType: string;
  /** The file's size in bytes. */
  readonly sizeBytes: number;
}

/** A stored receipt, ready to stream. */
export interface StoredReceipt extends StoredReceiptInfo {
  /** The file's bytes. */
  readonly stream: ReadableStream<Uint8Array>;
}

/**
 * Reads uploaded receipts from private storage.
 *
 * @remarks
 * Receipts are private financial documents and are kept indefinitely, so this
 * port has no delete.
 *
 * @example
 * ```ts
 * const file = await storage.read(pathname);
 * ```
 */
export interface ReceiptStorage {
  /**
   * Reads a stored file's metadata.
   *
   * @param pathname - The file's path in the store.
   * @returns The metadata, or `null` when missing.
   */
  stat(pathname: string): Promise<StoredReceiptInfo | null>;

  /**
   * Opens a stored file.
   *
   * @param pathname - The file's path in the store.
   * @returns The file, or `null` when missing.
   */
  read(pathname: string): Promise<StoredReceipt | null>;
}
