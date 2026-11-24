import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getEventSettings, getSignedInUser } from '@/composition';
import { requireLocale } from '@/i18n/locale';
import { LandingNav, LandingPage, toLandingFacts } from '@/modules/event/presentation';
import { LANDING_SECTIONS } from '@/modules/event/presentation/landing-sections';
import { SiteFooter } from '@/shared/ui/site-footer';
import { SiteHeader } from '@/shared/ui/site-header';
import { SessionActions } from '@/modules/identity/presentation/session-actions';

/** Event settings take effect on save, so this page renders per request. */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'landing' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { languages: { es: '/es', en: '/en' } },
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const locale = requireLocale((await params).locale);
  setRequestLocale(locale);
  const [settings, user, nav, footer] = await Promise.all([
    getEventSettings(),
    getSignedInUser(),
    getTranslations({ locale, namespace: 'nav' }),
    getTranslations({ locale, namespace: 'footer' }),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader navigation={<LandingNav signedIn={user.ok} />} actions={<SessionActions />} />
      <LandingPage facts={toLandingFacts(settings, locale)} />
      <SiteFooter
        tagline={footer('tagline')}
        sections={LANDING_SECTIONS.map(({ href, key }) => ({ href, label: nav(key) }))}
      />
    </div>
  );
}
