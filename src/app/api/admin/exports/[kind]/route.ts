import { getTranslations } from 'next-intl/server';

import { getAdminUser, getEventSettings, listAllRegistrations } from '@/composition';
import { buildRegistrationsCsv, buildShirtNamesCsv } from '@/modules/registration';

export const runtime = 'nodejs';

const BYTE_ORDER_MARK = '﻿';

/** Generates an export on request. It is never stored or logged. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string }> },
): Promise<Response> {
  const admin = await getAdminUser();
  if (!admin.ok) return new Response(null, { status: 404 });

  const { kind } = await params;
  if (kind !== 'registrations' && kind !== 'shirts') return new Response(null, { status: 404 });

  const [t, registrations, settings] = await Promise.all([
    getTranslations({ locale: 'es', namespace: 'admin.export' }),
    listAllRegistrations(),
    getEventSettings(),
  ]);
  const csv =
    kind === 'registrations'
      ? buildRegistrationsCsv(registrations, {
          bibNumber: t('bib'),
          runnerName: t('runner'),
          distance: t('distance'),
          shirtSize: t('size'),
          shirtName: t('shirt'),
          status: t('status'),
        })
      : buildShirtNamesCsv(registrations, settings.shirtSizes, {
          shirtSize: t('size'),
          shirtName: t('shirt'),
          runnerName: t('runner'),
        });

  return new Response(`${BYTE_ORDER_MARK}${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="catarinotlon-${kind}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
