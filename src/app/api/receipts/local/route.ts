import { getSignedInUser, localReceiptStore, receiptMaxBytes } from '@/composition';
import { checkReceiptUpload, isOwnReceiptPath } from '@/modules/payments';

export const runtime = 'nodejs';

const status = (code: number) => new Response(null, { status: code });

/** Receives uploads on the local disk. It does not exist when receipts go to Blob. */
export async function POST(request: Request): Promise<Response> {
  const store = localReceiptStore();
  if (!store) return status(404);

  const user = await getSignedInUser();
  if (!user.ok) return status(401);

  const data = await request.formData();
  const file = data.get('file');
  const pathname = String(data.get('pathname') ?? '');
  if (!(file instanceof File) || !isOwnReceiptPath(pathname, user.value.id)) return status(400);

  const check = checkReceiptUpload(
    { contentType: file.type, sizeBytes: file.size },
    receiptMaxBytes,
  );
  if (!check.ok) return status(400);

  await store.write(pathname, file.type, new Uint8Array(await file.arrayBuffer()));
  return status(204);
}
