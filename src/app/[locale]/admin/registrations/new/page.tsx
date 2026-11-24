import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getAdminUser, isOwner, getEventSettings } from '@/composition';
import { requireLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { createRegistrationAction } from '@/modules/payments/presentation/admin-actions';
import { AdminRegistrationForm } from '@/modules/payments/presentation/admin-registration-form';
import { AdminShell } from '@/modules/payments/presentation/admin-shell';
import { SessionActions } from '@/modules/identity/presentation/session-actions';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'admin.form' });
  return { title: t('newMeta'), robots: { index: false } };
}

export default async function NewRegistrationPage({ params }: Props) {
  const locale = requireLocale((await params).locale);
  setRequestLocale(locale);
  if (!(await getAdminUser()).ok) notFound();

  const [t, admin, settings] = await Promise.all([
    getTranslations({ locale, namespace: 'admin.form' }),
    getTranslations({ locale, namespace: 'admin' }),
    getEventSettings(),
  ]);

  return (
    <AdminShell actions={<SessionActions />} canManageAdmins={await isOwner()}>
      <div className="flex flex-col gap-4">
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center self-start font-semibold underline underline-offset-2"
        >
          {admin('back')}
        </Link>
        <h1 className="m-0 font-heading text-5xl">{t('newTitle')}</h1>
        <p className="m-0 max-w-xl text-muted-foreground">{t('newBody')}</p>
        <AdminRegistrationForm
          mode="new"
          action={createRegistrationAction}
          shirtSizes={settings.shirtSizes}
        />
      </div>
    </AdminShell>
  );
}
