import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import {
  accountDirectory,
  accounts,
  eventSettingsHistory,
  getAdminUser,
  isOwner,
  getEventSettings,
} from '@/composition';
import { requireLocale } from '@/i18n/locale';
import { missingSettings } from '@/modules/event';
import { saveSettingsAction } from '@/modules/payments/presentation/admin-actions';
import { AdminShell } from '@/modules/payments/presentation/admin-shell';
import { EventSettingsForm } from '@/modules/payments/presentation/event-settings-form';
import { SessionActions } from '@/app/[locale]/_chrome/session-actions';
import { SiteNavigation } from '@/app/[locale]/_chrome/site-navigation';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'admin.settings' });
  return { title: t('metaTitle'), robots: { index: false } };
}

export default async function SettingsPage({ params }: Props) {
  const locale = requireLocale((await params).locale);
  setRequestLocale(locale);
  const admin = await getAdminUser();
  if (!admin.ok) notFound();

  const [values, history, signInMethod] = await Promise.all([
    getEventSettings(),
    eventSettingsHistory(),
    accounts.signInMethod(admin.value.id),
  ]);
  const entries = await Promise.all(
    history.map(async (version) => ({
      id: version.id,
      changedFields: version.changedFields,
      changedBy:
        (await accountDirectory.accountHolder(version.changedBy))?.name ?? version.changedBy,
      createdAt: version.createdAt,
    })),
  );

  return (
    <AdminShell
      navigation={<SiteNavigation />}
      actions={<SessionActions />}
      canManageAdmins={await isOwner()}
    >
      <EventSettingsForm
        values={values}
        missing={missingSettings(values)}
        action={saveSettingsAction}
        history={entries}
        adminHasPassword={signInMethod === 'password'}
      />
    </AdminShell>
  );
}
