import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { requireLocale } from '@/i18n/locale';
import { resendVerificationAction } from '@/modules/identity/presentation/auth-actions';
import { PENDING_EMAIL_COOKIE } from '@/modules/identity/presentation/legal-versions';
import { VerifyEmailPanel } from '@/modules/identity/presentation/verify-email-panel';
import { Card, PageShell } from '@/shared/ui/page-shell';
import { SessionActions } from '@/app/[locale]/_chrome/session-actions';

import { SiteNavigation } from '../_chrome/site-navigation';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ verified?: string }>;
};

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'auth.verify' });
  return { title: t('metaTitle'), robots: { index: false } };
}

export default async function VerifyEmailPage({ params, searchParams }: Props) {
  const locale = requireLocale((await params).locale);
  setRequestLocale(locale);
  const { verified } = await searchParams;
  const email = (await cookies()).get(PENDING_EMAIL_COOKIE)?.value ?? null;

  return (
    <PageShell width="narrow" centered navigation={<SiteNavigation />} actions={<SessionActions />}>
      <Card>
        <VerifyEmailPanel
          email={email}
          verified={verified === '1'}
          resendAction={resendVerificationAction}
        />
      </Card>
    </PageShell>
  );
}
