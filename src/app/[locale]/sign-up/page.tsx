import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getEventSettings, getSignedInUser } from '@/composition';
import { requireLocale } from '@/i18n/locale';
import { getPathname, Link, redirect } from '@/i18n/navigation';
import { isPaymentOpen } from '@/modules/event';
import { googleSignInAction, signUpAction } from '@/modules/identity/presentation/auth-actions';
import { SignUpForm } from '@/modules/identity/presentation/auth-forms';
import { PageIntro, PageShell } from '@/shared/ui/page-shell';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'auth.signUp' });
  return {
    title: t('metaTitle'),
    alternates: {
      languages: {
        es: getPathname({ href: '/sign-up', locale: 'es' }),
        en: getPathname({ href: '/sign-up', locale: 'en' }),
      },
    },
  };
}

export default async function SignUpPage({ params }: Props) {
  const locale = requireLocale((await params).locale);
  setRequestLocale(locale);

  const user = await getSignedInUser();
  if (user.ok) redirect({ href: '/account', locale });

  const [t, settings] = await Promise.all([
    getTranslations({ locale, namespace: 'auth.signUp' }),
    getEventSettings(),
  ]);

  return (
    <PageShell
      actions={
        <span className="hidden text-sm sm:inline">
          {t('haveAccount')}{' '}
          <Link href="/sign-in" className="font-semibold underline underline-offset-2">
            {t('signIn')}
          </Link>
        </span>
      }
    >
      <SignUpForm
        action={signUpAction}
        googleAction={googleSignInAction}
        shirtSizes={settings.shirtSizes}
        open={isPaymentOpen(settings) && settings.shirtSizes.length > 0}
        intro={<PageIntro eyebrow={t('eyebrow')} title={t('title')} body={t('body')} />}
      />
    </PageShell>
  );
}
