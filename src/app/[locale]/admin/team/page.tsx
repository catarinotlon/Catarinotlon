import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getAdminTeam, getOwnerUser } from '@/composition';
import { requireLocale } from '@/i18n/locale';
import {
  grantAdminAction,
  revokeAdminAction,
} from '@/modules/identity/presentation/admin-team-actions';
import { AdminTeamPanel } from '@/modules/identity/presentation/admin-team-panel';
import { SessionActions } from '@/app/[locale]/_chrome/session-actions';
import { SiteNavigation } from '@/app/[locale]/_chrome/site-navigation';
import { AdminShell } from '@/modules/payments/presentation/admin-shell';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'admin.team' });
  return { title: t('metaTitle'), robots: { index: false } };
}

export default async function AdminTeamPage({ params }: Props) {
  const locale = requireLocale((await params).locale);
  setRequestLocale(locale);
  if (!(await getOwnerUser()).ok) notFound();

  const team = await getAdminTeam();

  return (
    <AdminShell navigation={<SiteNavigation />} actions={<SessionActions />} canManageAdmins>
      <AdminTeamPanel
        owners={team.owners}
        admins={team.admins}
        grantAction={grantAdminAction}
        revokeAction={revokeAdminAction}
      />
    </AdminShell>
  );
}
