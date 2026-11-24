import type { Metadata } from 'next';
import { Barlow, Barlow_Condensed } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

import { siteUrl } from '@/composition';
import { routing } from '@/i18n/routing';

import '../globals.css';

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
});

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-barlow-condensed',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** Open Graph locale codes, which name a region as well as a language. */
const OPEN_GRAPH_LOCALES = { es: 'es_MX', en: 'en_US' } as const;

/**
 * Gives every page a title, including the 404 page, which has no metadata of its own, and the
 * event card social networks show when any link to the site is shared.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'landing' });
  const share = { title: t('metaTitle'), description: t('metaDescription') };
  return {
    metadataBase: siteUrl,
    title: { default: share.title, template: '%s' },
    openGraph: {
      ...share,
      type: 'website',
      siteName: 'Catarinotlón',
      locale: OPEN_GRAPH_LOCALES[locale],
      alternateLocale: routing.locales
        .filter((other) => other !== locale)
        .map((other) => OPEN_GRAPH_LOCALES[other]),
    },
    twitter: { ...share, card: 'summary_large_image' },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${barlow.variable} ${barlowCondensed.variable}`}
    >
      <body>
        {/* The color scheme comes from globals.css: next-themes would set a plain "light". */}
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          enableColorScheme={false}
        >
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
