import {
  authorizeReceipt,
  findPayment,
  getAdminUser,
  getSignedInUser,
  receiptStorage,
} from '@/composition';

export const runtime = 'nodejs';

const notFound = () => new Response(null, { status: 404 });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
): Promise<Response> {
  const user = await getSignedInUser();
  if (!user.ok) return notFound();

  const { paymentId } = await params;
  const payment = await findPayment(paymentId);
  if (!payment) return notFound();

  const admin = await getAdminUser();
  const requestedFile = new URL(request.url).searchParams.get('file');
  const authorized = await authorizeReceipt({
    userId: user.value.id,
    isAdmin: admin.ok,
    paymentId,
    pathname: requestedFile ?? payment.receipt.pathname,
  });
  if (!authorized.ok) return notFound();

  const file = await receiptStorage.read(authorized.value.pathname);
  if (!file) return notFound();

  return new Response(file.stream, {
    headers: {
      'Content-Type': authorized.value.contentType,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
