import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { ImageResponse } from 'next/og';
import type { ReactNode } from 'react';

import { requireLocale } from '@/i18n/locale';
import { routing } from '@/i18n/routing';
import { DISTANCES } from '@/modules/registration';
import { SHARE_CARD_SIZE, ShareCard, ShareCardAccent } from '@/shared/ui/share-card';

const ASSETS = join(process.cwd(), 'src/app/[locale]/_share');

/** The assets never change, so they are read once per server instance. */
const assets = Promise.all([
  readFile(join(ASSETS, 'Barlow-Bold.ttf')),
  readFile(join(ASSETS, 'BarlowCondensed-BlackItalic.ttf')),
  readFile(join(process.cwd(), 'public/images/shirt/shirt-back-blank.jpg'), 'base64'),
  readFile(join(ASSETS, 'medal-finisher-5k.png'), 'base64'),
]);

export const contentType = 'image/png';

/**
 * One image per locale, with its alt text in that locale. Next.js also calls this while it
 * collects the static params, so an unknown locale yields no image instead of a 404 error.
 */
export async function generateImageMetadata({ params }: { params?: { locale?: string } }) {
  const locale = params?.locale;
  if (!locale || !hasLocale(routing.locales, locale)) return [];
  const t = await getTranslations({ locale, namespace: 'share' });
  return [{ id: 'event', alt: t('imageAlt'), size: SHARE_CARD_SIZE, contentType }];
}

/** The card social networks show when a link to the site is shared. */
export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const locale = requireLocale((await params).locale);
  const [t, shirt, [barlow, barlowCondensed, shirtPhoto, medal]] = await Promise.all([
    getTranslations({ locale, namespace: 'share' }),
    getTranslations({ locale, namespace: 'shirt' }),
    assets,
  ]);
  const accent = (chunks: ReactNode) => <ShareCardAccent>{chunks}</ShareCardAccent>;

  return new ImageResponse(
    <ShareCard
      eyebrow={t.rich('eyebrow', { year: accent })}
      headline={t.rich('headline', { highlight: accent })}
      perks={t('perks')}
      distances={DISTANCES}
      shirtName={shirt('placeholderName')}
      shirtSrc={`data:image/jpeg;base64,${shirtPhoto}`}
      medalSrc={`data:image/png;base64,${medal}`}
    />,
    {
      ...SHARE_CARD_SIZE,
      fonts: [
        { name: 'Barlow', data: barlow, weight: 700, style: 'normal' },
        { name: 'Barlow Condensed', data: barlowCondensed, weight: 900, style: 'italic' },
      ],
    },
  );
}
