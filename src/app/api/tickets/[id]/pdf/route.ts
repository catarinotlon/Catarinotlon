import { getAdminUser, getSignedInUser, renderTicketPdf } from '@/composition';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await getSignedInUser();
  if (!user.ok) return new Response(null, { status: 404 });

  const [{ id }, admin] = await Promise.all([params, getAdminUser()]);
  const locale = new URL(request.url).searchParams.get('locale') === 'en' ? 'en' : 'es';
  const pdf = await renderTicketPdf({
    userId: user.value.id,
    isAdmin: admin.ok,
    ticketId: id,
    locale,
  });
  if (!pdf.ok) return new Response(null, { status: 404 });

  return new Response(pdf.value as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="boleto-catarinotlon-2026.pdf"',
      'Cache-Control': 'private, no-store',
    },
  });
}
