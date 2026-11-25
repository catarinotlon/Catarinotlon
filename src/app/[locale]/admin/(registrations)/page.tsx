import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getAdminRows, getAdminUser, isOwner } from '@/composition';
import { requireLocale } from '@/i18n/locale';
import { adminTotals, filterAdminRows } from '@/modules/payments';
import { AdminShell } from '@/modules/payments/presentation/admin-shell';
import { RegistrationsTable } from '@/modules/payments/presentation/registrations-table';
import { SessionActions } from '@/app/[locale]/_chrome/session-actions';
import { SiteNavigation } from '@/app/[locale]/_chrome/site-navigation';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; distance?: string; payment?: string; kit?: string }>;
};

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'admin.list' });
  return { title: t('metaTitle') };
}

export default async function AdminPage({ params, searchParams }: Props) {
  const locale = requireLocale((await params).locale);
  setRequestLocale(locale);
  if (!(await getAdminUser()).ok) notFound();

  const { q, distance, payment, kit } = await searchParams;
  const filter = {
    ...(q ? { query: q } : {}),
    ...(distance ? { distance } : {}),
    ...(payment ? { payment } : {}),
    ...(kit ? { kit } : {}),
  };
  const rows = await getAdminRows();

  return (
    <AdminShell
      navigation={<SiteNavigation />}
      actions={<SessionActions />}
      canManageAdmins={await isOwner()}
    >
      <RegistrationsTable
        rows={filterAdminRows(rows, filter)}
        totals={adminTotals(rows)}
        filter={filter}
        totalRows={rows.length}
      />
    </AdminShell>
  );
}
