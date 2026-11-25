import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { requireLocale } from '@/i18n/locale';
import { forgotPasswordAction } from '@/modules/identity/presentation/auth-actions';
import { ForgotPasswordForm } from '@/modules/identity/presentation/auth-forms';
import { Card, PageShell } from '@/shared/ui/page-shell';
import { SessionActions } from '@/modules/identity/presentation/session-actions';

import { SiteNavigation } from '../_chrome/site-navigation';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'auth.forgot' });
  return { title: t('metaTitle') };
}

export default async function ForgotPasswordPage({ params }: Props) {
  const locale = requireLocale((await params).locale);
  setRequestLocale(locale);

  return (
    <PageShell width="narrow" centered navigation={<SiteNavigation />} actions={<SessionActions />}>
      <Card>
        <ForgotPasswordForm action={forgotPasswordAction} />
      </Card>
    </PageShell>
  );
}
