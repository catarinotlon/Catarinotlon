'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import type { ComponentProps } from 'react';

import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

import { cn } from './cn';
import { SegmentedControl } from './segmented-control';

/** Props of {@link LanguageSwitch}. */
export interface LanguageSwitchProps {
  /** `compact` shows `ES | EN`. `full` shows the language names. */
  variant: 'compact' | 'full';
}

/**
 * Switches language while staying on the same page.
 *
 * @remarks
 * next-intl remembers the choice in its locale cookie.
 *
 * @param props - The display variant.
 * @returns The language switch.
 */
export function LanguageSwitch({ variant }: LanguageSwitchProps) {
  const t = useTranslations('language');
  const active = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const href = { pathname, params } as unknown as ComponentProps<typeof Link>['href'];
  const compact = variant === 'compact';

  if (compact) {
    return (
      <SegmentedControl
        variant="compact"
        label={t('switchTo')}
        options={routing.locales.map((locale) => ({ value: locale, label: locale.toUpperCase() }))}
        value={active}
        renderOption={(option, { selected, className }) =>
          selected ? (
            <span aria-current="true" className={className}>
              {option.label}
            </span>
          ) : (
            <Link
              href={href}
              locale={option.value as (typeof routing.locales)[number]}
              lang={option.value}
              className={className}
            >
              {option.label}
              <span className="sr-only">
                {' '}
                {t(option.value as (typeof routing.locales)[number])}
              </span>
            </Link>
          )
        }
      />
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className="mr-1 text-muted-foreground">{t('label')}</span>
      {routing.locales.map((locale, index) => (
        <span key={locale} className="inline-flex items-center gap-1">
          {index > 0 && (
            <span aria-hidden="true" className="text-muted-foreground">
              ·
            </span>
          )}
          {locale === active ? (
            <span aria-current="true" className="px-1 font-bold">
              {t(locale)}
            </span>
          ) : (
            <Link
              href={href}
              locale={locale}
              lang={locale}
              className={cn(
                'inline-flex min-h-11 items-center px-1 font-semibold text-foreground underline-offset-4 hover:underline',
              )}
            >
              {t(locale)}
            </Link>
          )}
        </span>
      ))}
    </span>
  );
}
