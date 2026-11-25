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
  /**
   * The site navigation: section links on wide screens and the menu button on narrow ones.
   * With it, phones leave the language, theme, and account to that menu.
   */
  navigation?: ReactNode;
  /** Replaces the default sign-in and register actions. */
  actions?: ReactNode;
  /** A label next to the logo, on admin pages. */
  badge?: string;
}

/**
 * The header on every page: logo, language, theme, and account actions.
 *
 * @remarks
 * On phones, a header with the site navigation shows only the logo and the menu button,
 * whose drawer holds the rest. A header without it, such as the admin one, keeps its
 * controls on every screen size.
 *
 * @param props - Optional navigation and actions.
 * @returns The site header.
 */
export function SiteHeader({ navigation, actions, badge }: SiteHeaderProps) {
  const t = useTranslations('common');

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background px-5 md:px-10">
      <div className="mx-auto flex min-h-16 max-w-[1200px] items-center justify-between gap-4 xl:min-h-18 xl:gap-6">
        <div className="flex min-w-0 items-center gap-3 xl:shrink-0">
          <Link
            href="/"
            aria-label={t('homeLabel')}
            className="flex min-h-11 items-center gap-2 text-foreground no-underline xl:gap-2.5"
          >
            <Logo />
            <span
              className={cn(
                'font-heading text-xl/none whitespace-nowrap xl:text-2xl/none',
                badge ? 'hidden sm:block' : 'hidden min-[360px]:block',
              )}
            >
              {t('appName')} <span className="block text-primary-text xl:inline">{t('year')}</span>
            </span>
          </Link>
          {badge && (
            <span className="shrink-0 rounded-full bg-inverse px-3 py-1 text-sm font-bold tracking-widest text-inverse-foreground uppercase">
              {badge}
            </span>
          )}
        </div>
        {navigation}
        <div className={cn('ml-auto items-center gap-2', navigation ? 'hidden md:flex' : 'flex')}>
          <span className="hidden md:inline-flex">
            <LanguageSwitch variant="subtle" />
          </span>
          <ThemeSwitch />
          <div className="flex items-center gap-2 before:mx-1.5 before:h-6 before:w-px before:bg-border empty:hidden">
            {actions ?? <SignedOutActions />}
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * Sign-in and registration links for visitors without a session.
 *
 * @remarks
 * Hidden on narrow screens, where the page's own menu offers them.
 *
 * @returns The two links.
 */
export function SignedOutActions() {
  const t = useTranslations('common');
  return (
    <>
      <Link
        href="/sign-in"
        className="hidden min-h-11 items-center px-3 text-base font-bold whitespace-nowrap text-foreground no-underline hover:underline sm:inline-flex"
      >
        {t('signIn')}
      </Link>
      <Link
        href="/sign-up"
        className={cn(
          buttonClasses({ variant: 'cta' }),
          'hidden min-h-11 px-5 py-1 text-lg whitespace-nowrap sm:inline-flex',
        )}
      >
        {t('register')}
      </Link>
    </>
  );
}
