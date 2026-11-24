import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { buttonClasses } from './button';
import { cn } from './cn';
import { LanguageSwitch } from './language-switch';
import { Logo } from './logo';

const LINK =
  'inline-flex min-h-11 items-center text-muted-foreground underline underline-offset-4 hover:text-foreground';

/** Props of {@link SiteFooter}. */
export interface SiteFooterProps {
  /** A short line naming the race, on the landing page. */
  tagline?: string;
  /** Links to the page's sections, on the landing page. */
  sections?: readonly { href: string; label: string }[];
  /** Whether this is an admin page. */
  admin?: boolean;
}

/**
 * The footer on every page, with the legal links and the language switch.
 *
 * @param props - The landing page's extras, or the admin flag.
 * @returns The site footer.
 */
export function SiteFooter({ tagline, sections, admin = false }: SiteFooterProps) {
  const t = useTranslations('footer');
  const common = useTranslations('common');
  const legalAndLanguage = (
    <div className="flex flex-col gap-x-6 md:flex-row md:items-center">
      <div className="flex flex-wrap items-center gap-x-4">
        <Link href="/terms" className={LINK}>
          {t('terms')}
        </Link>
        <Link href="/privacy" className={LINK}>
          {t('privacy')}
        </Link>
      </div>
      <LanguageSwitch variant="full" />
    </div>
  );

  if (sections) {
    return (
      <footer className="dark mt-auto overflow-hidden bg-ink px-5 pt-12 pb-6 text-foreground md:px-10">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
          <div className="flex flex-col gap-8 md:flex-row md:gap-32">
            <div className="flex flex-col items-start gap-3">
              <span className="flex items-center gap-2">
                <Logo />
                <span className="font-heading text-xl/none">
                  {common('appName')}{' '}
                  <span className="block text-primary-text">{common('year')}</span>
                </span>
              </span>
              {tagline && <p className="m-0 text-muted-foreground">{tagline}</p>}
              <Link
                href="/sign-up"
                className={cn(buttonClasses({ variant: 'cta' }), 'min-h-11 py-1 text-base')}
              >
                {common('register')}
              </Link>
            </div>
            <nav aria-label={t('event')} className="flex flex-col">
              <p className="m-0 mb-1 text-sm font-bold tracking-widest text-gold uppercase">
                {t('event')}
              </p>
              {sections.map((section) => (
                <a
                  key={section.href}
                  href={section.href}
                  className="inline-flex min-h-11 items-center text-foreground no-underline hover:underline"
                >
                  {section.label}
                </a>
              ))}
            </nav>
          </div>
          <svg aria-hidden="true" viewBox="0 0 1000 150" className="block w-full">
            <text
              x="500"
              y="125"
              textAnchor="middle"
              textLength="840"
              lengthAdjust="spacingAndGlyphs"
              fill="var(--surface-raised)"
              className="font-heading text-[150px]"
            >
              {common('appName').toLocaleUpperCase()}
            </text>
          </svg>
          <div className="flex flex-col gap-x-6 gap-y-1 border-t border-border pt-4 text-sm md:flex-row md:items-center md:justify-between">
            <p className="m-0 text-muted-foreground">{t('copyright', { year: '2026' })}</p>
            {legalAndLanguage}
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="mt-auto border-t border-border px-5 py-6 md:px-10">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-x-6 gap-y-1 text-sm md:flex-row md:items-center md:justify-between">
        <p className="m-0 text-muted-foreground">
          {t(admin ? 'copyrightAdmin' : 'copyright', { year: '2026' })}
        </p>
        {legalAndLanguage}
      </div>
    </footer>
  );
}
