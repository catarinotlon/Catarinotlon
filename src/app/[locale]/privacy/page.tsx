import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { requireLocale } from '@/i18n/locale';
import { getPathname } from '@/i18n/navigation';
import { LegalDocument } from '@/modules/event/presentation/legal-document';
import { PageShell } from '@/shared/ui/page-shell';
import { SessionActions } from '@/app/[locale]/_chrome/session-actions';

import { SiteNavigation } from '../_chrome/site-navigation';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'legal' });
  return {
    title: t('privacy.title'),
    alternates: {
      languages: {
        es: getPathname({ href: '/privacy', locale: 'es' }),
        en: getPathname({ href: '/privacy', locale: 'en' }),
      },
    },
  };
}

export default async function PrivacyPage({ params }: Props) {
  const locale = requireLocale((await params).locale);
  setRequestLocale(locale);

  return (
    <PageShell
      width="medium"
      background="plain"
      navigation={<SiteNavigation />}
      actions={<SessionActions />}
    >
      <LegalDocument document="privacy" />
    </PageShell>
  );
}
