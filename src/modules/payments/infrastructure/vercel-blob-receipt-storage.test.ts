import { describe, expect, it } from 'vitest';

import { VercelBlobReceiptStorage, type BlobClient } from './vercel-blob-receipt-storage';

const PATH = 'receipts/user-1/file.pdf';

function client(overrides: Partial<BlobClient> = {}): BlobClient & { accesses: string[] } {
  const accesses: string[] = [];
  return {
    accesses,
    get: async (_pathname, options) => {
      accesses.push(options.access);
      return {
        statusCode: 200,
        stream: new Response('%PDF').body as ReadableStream<Uint8Array>,
        blob: { contentType: 'application/pdf', size: 4 },
      };
    },
    ...overrides,
  };
}

describe('VercelBlobReceiptStorage', () => {
  it('reads with private access', async () => {
    const blob = client();

    const file = await new VercelBlobReceiptStorage(blob).read(PATH);

    expect(blob.accesses).toEqual(['private']);
    expect(file).toMatchObject({ contentType: 'application/pdf', sizeBytes: 4 });
    expect(await new Response(file?.stream).text()).toBe('%PDF');
  });

  it('reports the metadata the store holds', async () => {
    const info = await new VercelBlobReceiptStorage(client()).stat(PATH);

    expect(info).toEqual({ contentType: 'application/pdf', sizeBytes: 4 });
  });

  it('returns null for a missing file', async () => {
    const storage = new VercelBlobReceiptStorage(client({ get: async () => null }));

    expect(await storage.read(PATH)).toBeNull();
    expect(await storage.stat(PATH)).toBeNull();
  });
});
