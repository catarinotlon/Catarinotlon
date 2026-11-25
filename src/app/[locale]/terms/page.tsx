import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getEventSettings } from '@/composition';
import { requireLocale } from '@/i18n/locale';
import { getPathname } from '@/i18n/navigation';
import { LegalDocument } from '@/modules/event/presentation/legal-document';
import { toLegalFacts } from '@/modules/event/presentation/legal-facts';
import { PageShell } from '@/shared/ui/page-shell';
import { SessionActions } from '@/app/[locale]/_chrome/session-actions';

import { SiteNavigation } from '../_chrome/site-navigation';

/** The terms show the event settings, which take effect on save. */
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'legal' });
  return {
    title: `${t('terms.title')} · Catarinotlón 2026`,
    alternates: {
      languages: {
        es: getPathname({ href: '/terms', locale: 'es' }),
        en: getPathname({ href: '/terms', locale: 'en' }),
      },
    },
  };
}

export default async function TermsPage({ params }: Props) {
  const locale = requireLocale((await params).locale);
  setRequestLocale(locale);
  const facts = toLegalFacts(await getEventSettings(), locale);

  return (
    <PageShell
      width="medium"
      background="plain"
      navigation={<SiteNavigation />}
      actions={<SessionActions />}
    >
      <LegalDocument document="terms" facts={facts} />
    </PageShell>
  );
}
