import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import {
  getEventSettings,
  getPaymentSummary,
  getSignedInUser,
  listRunners,
  receiptUploadMode,
} from '@/composition';
import { requireLocale } from '@/i18n/locale';
import { Link, redirect } from '@/i18n/navigation';
import { isPaymentOpen } from '@/modules/event';
import { recordReceiptAction } from '@/modules/payments/presentation/payment-actions';
import { PaymentView } from '@/modules/payments/presentation/payment-view';
import { buttonClasses } from '@/shared/ui/button';
import { Card, PageIntro, PageShell } from '@/shared/ui/page-shell';
import { SessionActions } from '@/app/[locale]/_chrome/session-actions';

import { SiteNavigation } from '../_chrome/site-navigation';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'payment' });
  return { title: t('metaTitle') };
}

export default async function PaymentPage({ params }: Props) {
  const locale = requireLocale((await params).locale);
  setRequestLocale(locale);

  const user = await getSignedInUser();
  if (!user.ok) return redirect({ href: '/sign-in', locale });
  if ((await listRunners(user.value.id)).length === 0) {
    return redirect({ href: '/register', locale });
  }

  const [t, common, settings, summary] = await Promise.all([
    getTranslations({ locale, namespace: 'payment' }),
    getTranslations({ locale, namespace: 'common' }),
    getEventSettings(),
    getPaymentSummary(user.value.id, user.value.name),
  ]);

  if (!isPaymentOpen(settings) || !settings.bank) {
    return (
      <PageShell width="narrow" navigation={<SiteNavigation />} actions={<SessionActions />}>
        <Card className="flex flex-col gap-3">
          <h1 className="m-0 font-heading text-4xl">{common('openingSoonTitle')}</h1>
          <p className="m-0 text-muted-foreground">{common('openingSoonBody')}</p>
        </Card>
      </PageShell>
    );
  }

  if (summary.runners.length === 0) {
    return (
      <PageShell width="narrow" navigation={<SiteNavigation />} actions={<SessionActions />}>
        <Card className="flex flex-col gap-3">
          <h1 className="m-0 font-heading text-4xl">{t('nothingTitle')}</h1>
          <p className="m-0 text-muted-foreground">{t('nothingBody')}</p>
          <Link href="/account" className={buttonClasses({ fullWidth: true })}>
            {t('toAccount')}
          </Link>
        </Card>
      </PageShell>
    );
  }

  const contact = settings.contact;

  return (
    <PageShell navigation={<SiteNavigation />} actions={<SessionActions />}>
      <div className="flex flex-col gap-6">
        <PaymentView
          intro={<PageIntro title={t('title')} body={t('body')} />}
          userId={user.value.id}
          uploadMode={receiptUploadMode}
          recordReceipt={recordReceiptAction}
          bank={settings.bank}
          contact={
            contact
              ? {
                  fullName: contact.fullName,
                  phone: contact.phone,
                  email: contact.email,
                  whatsapp: contact.whatsapp,
                  hours: locale === 'en' ? contact.hours.en : contact.hours.es,
                }
              : null
          }
          concept={summary.concept}
          totalCents={summary.totalCents}
          runners={summary.runners.map((runner) => ({
            id: runner.id,
            runnerName: runner.runnerName,
            distance: runner.distance,
            shirtName: runner.shirtName,
            shirtSize: runner.shirtSize,
            feeCents: runner.feeCents,
          }))}
        />
      </div>
    </PageShell>
  );
}
