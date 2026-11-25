import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { activePickup, findKit, getAdminRows, getAdminUser, isOwner } from '@/composition';
import { requireLocale } from '@/i18n/locale';
import { filterAdminRows, type AdminRow } from '@/modules/payments';
import { deliverKitAction, undoKitAction } from '@/modules/payments/presentation/admin-actions';
import { AdminShell } from '@/modules/payments/presentation/admin-shell';
import { KitPickupPanel, type KitRunner } from '@/modules/payments/presentation/kit-pickup-panel';
import { KitPickupScanner, type KitScan } from '@/modules/payments/presentation/kit-pickup-scanner';
import { SessionActions } from '@/app/[locale]/_chrome/session-actions';
import { SiteNavigation } from '@/app/[locale]/_chrome/site-navigation';

export const dynamic = 'force-dynamic';

const MAX_RESULTS = 10;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; ticket?: string }>;
};

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'admin.kits' });
  return { title: t('metaTitle') };
}

async function searchRows(query: string): Promise<AdminRow[]> {
  if (!query) return [];
  return filterAdminRows(await getAdminRows(), { query }).slice(0, MAX_RESULTS);
}

async function toKitRunner(row: AdminRow): Promise<KitRunner> {
  const pickup = await activePickup(row.id);
  return {
    id: row.id,
    runnerName: row.runnerName,
    distance: row.distance,
    shirtSize: row.shirtSize,
    shirtName: row.shirtName,
    bibNumber: row.bibNumber,
    paymentState: row.paymentState,
    kitDelivered: row.kitDelivered,
    collectedBy: pickup?.collectedBy ?? null,
    deliveredAt: pickup?.deliveredAt ?? null,
  };
}

async function lookUpTicket(ticketId: string): Promise<KitScan | null> {
  if (!ticketId) return null;
  const kit = await findKit(ticketId);
  const row = kit.ok
    ? (await getAdminRows()).find((candidate) => candidate.id === kit.value.registration.id)
    : undefined;
  return { ticketId, runner: row ? await toKitRunner(row) : null };
}

export default async function KitPickupPage({ params, searchParams }: Props) {
  const locale = requireLocale((await params).locale);
  setRequestLocale(locale);
  if (!(await getAdminUser()).ok) notFound();

  const { q = '', ticket = '' } = await searchParams;
  const [t, scan, rows] = await Promise.all([
    getTranslations({ locale, namespace: 'admin.kits' }),
    lookUpTicket(ticket),
    searchRows(q),
  ]);
  const runners = await Promise.all(rows.map(toKitRunner));

  return (
    <AdminShell
      navigation={<SiteNavigation />}
      actions={<SessionActions />}
      canManageAdmins={await isOwner()}
    >
      <div className="mx-auto flex max-w-md flex-col gap-4 md:max-w-5xl">
        <h1 className="m-0 font-heading text-4xl">{t('title')}</h1>
        <KitPickupScanner
          query={q}
          scan={scan}
          deliverAction={deliverKitAction}
          undoAction={undoKitAction}
        >
          {q ? (
            runners.length === 0 ? (
              <p className="m-0 font-semibold">{t('noResults')}</p>
            ) : (
              runners.map((runner) => (
                <KitPickupPanel
                  key={`${runner.id}-${runner.kitDelivered}`}
                  runner={runner}
                  deliverAction={deliverKitAction}
                  undoAction={undoKitAction}
                />
              ))
            )
          ) : null}
        </KitPickupScanner>
      </div>
    </AdminShell>
  );
}
