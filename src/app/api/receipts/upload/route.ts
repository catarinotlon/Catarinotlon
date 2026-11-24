import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

import { getSignedInUser, receiptMaxBytes, receiptUploadMode } from '@/composition';
import { isOwnReceiptPath, RECEIPT_CONTENT_TYPES } from '@/modules/payments';

export const runtime = 'nodejs';

/** Issues a short-lived client token after checking the session and the path. */
export async function POST(request: Request): Promise<Response> {
  if (receiptUploadMode !== 'blob') return new Response(null, { status: 404 });

  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const user = await getSignedInUser();
        if (!user.ok || !isOwnReceiptPath(pathname, user.value.id)) {
          throw new Error('Not authorized');
        }
        return {
          allowedContentTypes: [...RECEIPT_CONTENT_TYPES],
          maximumSizeInBytes: receiptMaxBytes,
          addRandomSuffix: false,
          allowOverwrite: false,
        };
      },
      onUploadCompleted: async () => undefined,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Upload not allowed' }, { status: 400 });
  }
}
