import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Link } from '@/i18n/navigation';

import { buttonClasses } from './button';
import { cn } from './cn';
import { LanguageSwitch } from './language-switch';
import { Logo } from './logo';
import { ThemeSwitch } from './theme-switch';

/** Props of {@link SiteHeader}. */
export interface SiteHeaderProps {
  /** Section links or other navigation, shown on wide screens. */
  navigation?: ReactNode;
  /** Replaces the default sign-in and register actions. */
  actions?: ReactNode;
  /** A label next to the logo, on admin pages. */
  badge?: string;
}

/**
 * The header on every page: logo, language, theme, and account actions.
 *
 * @param props - Optional navigation and actions.
 * @returns The site header.
 */
export function SiteHeader({ navigation, actions, badge }: SiteHeaderProps) {
  const t = useTranslations('common');

  return (
    <header className="relative border-b border-border bg-background px-5 md:px-10">
      <div className="mx-auto flex min-h-16 max-w-[1200px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            aria-label={t('homeLabel')}
            className="flex min-h-11 items-center gap-2 text-foreground no-underline"
          >
            <Logo />
            <span className={cn('font-heading text-xl/none', badge ? 'hidden sm:block' : 'block')}>
              {t('appName')} <span className="block text-primary-text">{t('year')}</span>
            </span>
          </Link>
          {badge && (
            <span className="rounded-full bg-inverse px-3 py-1 text-sm font-bold tracking-widest text-inverse-foreground uppercase">
              {badge}
            </span>
          )}
        </div>
        {navigation}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden md:inline-flex">
            <LanguageSwitch variant="compact" />
          </span>
          <ThemeSwitch />
          {actions ?? (
            <>
              <Link
                href="/sign-in"
                className="hidden min-h-11 items-center px-2 font-semibold text-foreground no-underline hover:underline sm:inline-flex"
              >
                {t('signIn')}
              </Link>
              <Link href="/sign-up" className={cn(buttonClasses(), 'hidden sm:inline-flex')}>
                {t('register')}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
