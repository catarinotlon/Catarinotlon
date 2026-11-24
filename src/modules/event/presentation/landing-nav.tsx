'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Link } from '@/i18n/navigation';

import { LANDING_SECTIONS as SECTIONS } from './landing-sections';

/**
 * Links to the landing page's sections, inline on wide screens and in a menu on
 * narrow ones.
 *
 * @remarks
 * An admin also gets a link to the panel, in both places.
 *
 * @param props - Whether the visitor is signed in (if not, the menu offers the
 * account links) and whether they are an admin.
 * @returns The navigation.
 */
export function LandingNav({
  signedIn = false,
  isAdmin = false,
}: {
  signedIn?: boolean;
  isAdmin?: boolean;
}) {
  const t = useTranslations('nav');
  const common = useTranslations('common');
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav aria-label={t('main')} className="hidden items-center gap-5 lg:flex">
        {SECTIONS.map(({ href, key }) => (
          <a
            key={key}
            href={href}
            className="inline-flex min-h-11 items-center font-semibold text-foreground no-underline hover:underline"
          >
            {t(key)}
          </a>
        ))}
        {isAdmin && (
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center font-semibold text-primary-text no-underline hover:underline"
          >
            {t('admin')}
          </Link>
        )}
      </nav>

      <div className="order-last lg:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? t('closeMenu') : t('openMenu')}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border-2 border-input-border text-foreground"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
        {open && (
          <nav
            aria-label={t('menu')}
            className="absolute inset-x-0 top-16 z-20 flex flex-col border-b border-border bg-background px-5 py-2 shadow-lg"
          >
            {SECTIONS.map(({ href, key }) => (
              <a
                key={key}
                href={href}
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 items-center font-semibold text-foreground no-underline"
              >
                {t(key)}
              </a>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 items-center font-semibold text-primary-text no-underline"
              >
                {t('admin')}
              </Link>
            )}
            {!signedIn && (
              <>
                <Link
                  href="/sign-in"
                  className="inline-flex min-h-11 items-center font-semibold text-foreground no-underline"
                >
                  {common('signIn')}
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex min-h-11 items-center font-semibold text-primary-text no-underline"
                >
                  {common('register')}
                </Link>
              </>
            )}
          </nav>
        )}
      </div>
    </>
  );
}
