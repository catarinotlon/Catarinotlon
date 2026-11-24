import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { activePickup, findKit, getAdminRows, getAdminUser } from '@/composition';
import { requireLocale } from '@/i18n/locale';
import { filterAdminRows, type AdminRow } from '@/modules/payments';
import { deliverKitAction, undoKitAction } from '@/modules/payments/presentation/admin-actions';
import { AdminShell } from '@/modules/payments/presentation/admin-shell';
import { KitPickupPanel } from '@/modules/payments/presentation/kit-pickup-panel';
import { KitPickupSearch } from '@/modules/payments/presentation/kit-pickup-search';
import { SessionActions } from '@/modules/identity/presentation/session-actions';

export const dynamic = 'force-dynamic';

const MAX_RESULTS = 10;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; ticket?: string }>;
};

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'admin.kits' });
  return { title: t('metaTitle'), robots: { index: false } };
}

async function findRows(query: string, ticket: string): Promise<AdminRow[]> {
  const rows = await getAdminRows();
  if (ticket) {
    const kit = await findKit(ticket);
    return kit.ok ? rows.filter((row) => row.id === kit.value.registration.id) : [];
  }
  return query ? filterAdminRows(rows, { query }).slice(0, MAX_RESULTS) : [];
}

export default async function KitPickupPage({ params, searchParams }: Props) {
  const locale = requireLocale((await params).locale);
  setRequestLocale(locale);
  if (!(await getAdminUser()).ok) notFound();

  const { q = '', ticket = '' } = await searchParams;
  const [t, rows] = await Promise.all([
    getTranslations({ locale, namespace: 'admin.kits' }),
    findRows(q, ticket),
  ]);
  const pickups = await Promise.all(rows.map((row) => activePickup(row.id)));

  return (
    <AdminShell actions={<SessionActions />}>
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <h1 className="m-0 font-heading text-4xl">{t('title')}</h1>
        <KitPickupSearch query={q} />
        {(q || ticket) && rows.length === 0 && (
          <p className="m-0 font-semibold">{t('noResults')}</p>
        )}
        {rows.map((row, index) => (
          <KitPickupPanel
            key={`${row.id}-${row.kitDelivered}`}
            scanned={Boolean(ticket)}
            runner={{
              id: row.id,
              runnerName: row.runnerName,
              distance: row.distance,
              shirtSize: row.shirtSize,
              shirtName: row.shirtName,
              bibNumber: row.bibNumber,
              paymentState: row.paymentState,
              kitDelivered: row.kitDelivered,
              collectedBy: pickups[index]?.collectedBy ?? null,
            }}
            deliverAction={deliverKitAction}
            undoAction={undoKitAction}
          />
        ))}
      </div>
    </AdminShell>
  );
}
