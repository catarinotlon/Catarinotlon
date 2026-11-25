import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getSignedInUser } from '@/composition';
import { requireLocale } from '@/i18n/locale';
import { getPathname, redirect } from '@/i18n/navigation';
import { googleSignInAction, signInAction } from '@/modules/identity/presentation/auth-actions';
import { SignInForm } from '@/modules/identity/presentation/auth-forms';
import { KitStage } from '@/modules/event/presentation/kit-stage';
import { Card, PageShell } from '@/shared/ui/page-shell';
import { SessionActions } from '@/app/[locale]/_chrome/session-actions';

import { SiteNavigation } from '../_chrome/site-navigation';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'auth.signIn' });
  return {
    title: t('metaTitle'),
    alternates: {
      languages: {
        es: getPathname({ href: '/sign-in', locale: 'es' }),
        en: getPathname({ href: '/sign-in', locale: 'en' }),
      },
    },
  };
}

export default async function SignInPage({ params }: Props) {
  const locale = requireLocale((await params).locale);
  setRequestLocale(locale);

  const user = await getSignedInUser();
  if (user.ok) redirect({ href: '/account', locale });

  const t = await getTranslations({ locale, namespace: 'auth.signIn' });

  return (
    <PageShell navigation={<SiteNavigation />} actions={<SessionActions />}>
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
        <KitStage className="hidden lg:grid" />
        <Card className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="m-0 font-heading text-4xl md:text-5xl">{t('title')}</h1>
            <p className="m-0 text-muted-foreground">{t('body')}</p>
          </div>
          <SignInForm action={signInAction} googleAction={googleSignInAction} />
        </Card>
      </div>
    </PageShell>
  );
}
