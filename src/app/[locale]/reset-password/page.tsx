import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { requireLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { resetPasswordAction } from '@/modules/identity/presentation/auth-actions';
import { ResetPasswordForm } from '@/modules/identity/presentation/auth-forms';
import { FormAlert } from '@/shared/ui/form-fields';
import { Card, PageShell } from '@/shared/ui/page-shell';
import { SessionActions } from '@/app/[locale]/_chrome/session-actions';

import { SiteNavigation } from '../_chrome/site-navigation';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
};

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'auth.reset' });
  return { title: t('metaTitle'), robots: { index: false } };
}

export default async function ResetPasswordPage({ params, searchParams }: Props) {
  const locale = requireLocale((await params).locale);
  setRequestLocale(locale);
  const { token } = await searchParams;
  const [errors, forgot] = await Promise.all([
    getTranslations({ locale, namespace: 'errors' }),
    getTranslations({ locale, namespace: 'auth.forgot' }),
  ]);

  return (
    <PageShell width="narrow" centered navigation={<SiteNavigation />} actions={<SessionActions />}>
      <Card className="flex flex-col gap-4">
        {token ? (
          <ResetPasswordForm action={resetPasswordAction} token={token} />
        ) : (
          <>
            <FormAlert>{errors('invalidResetLink')}</FormAlert>
            <Link
              href="/forgot-password"
              className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2"
            >
              {forgot('title')}
            </Link>
          </>
        )}
      </Card>
    </PageShell>
  );
}
