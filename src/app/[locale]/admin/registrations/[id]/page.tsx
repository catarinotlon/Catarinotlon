import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import {
  accountDirectory,
  findRegistration,
  getAdminRows,
  getAdminUser,
  isOwner,
  getEventSettings,
} from '@/composition';
import { requireLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { editRegistrationAction } from '@/modules/payments/presentation/admin-actions';
import { AdminRegistrationForm } from '@/modules/payments/presentation/admin-registration-form';
import { AdminShell } from '@/modules/payments/presentation/admin-shell';
import { SessionActions } from '@/app/[locale]/_chrome/session-actions';
import { SiteNavigation } from '@/app/[locale]/_chrome/site-navigation';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'admin.form' });
  return { title: t('editMeta'), robots: { index: false } };
}

export default async function EditRegistrationPage({ params }: Props) {
  const { locale: rawLocale, id } = await params;
  const locale = requireLocale(rawLocale);
  setRequestLocale(locale);
  if (!(await getAdminUser()).ok) notFound();

  const registration = await findRegistration(id);
  if (!registration) notFound();

  const [t, admin, settings, rows, holder] = await Promise.all([
    getTranslations({ locale, namespace: 'admin.form' }),
    getTranslations({ locale, namespace: 'admin' }),
    getEventSettings(),
    getAdminRows(),
    registration.ownerId ? accountDirectory.accountHolder(registration.ownerId) : null,
  ]);
  const row = rows.find((item) => item.id === registration.id);

  return (
    <AdminShell
      navigation={<SiteNavigation />}
      actions={<SessionActions />}
      canManageAdmins={await isOwner()}
    >
      <div className="flex flex-col gap-4">
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center self-start font-semibold underline underline-offset-2"
        >
          {admin('back')}
        </Link>
        <h1 className="m-0 font-heading text-5xl">{t('editTitle')}</h1>
        <p className="m-0 max-w-xl text-muted-foreground">{t('editBody')}</p>
        <AdminRegistrationForm
          mode="edit"
          action={editRegistrationAction}
          shirtSizes={settings.shirtSizes}
          initial={{
            id: registration.id,
            runnerName: registration.runnerName,
            distance: registration.distance,
            shirtSize: registration.shirtSize,
            shirtName: registration.shirtName,
          }}
          summary={{
            account: holder ? `${holder.name} · ${holder.email}` : t('noAccount'),
            paymentState: row?.paymentState ?? 'pending',
            kitDelivered: row?.kitDelivered ?? false,
            bibNumber: registration.bibNumber,
          }}
        />
      </div>
    </AdminShell>
  );
}
