'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

/**
 * The link to the admin panel in the wide header, shown only to admins.
 *
 * @remarks
 * The visible pill is compact, but the link keeps a 44 px tall target. Showing it is not
 * access control: every admin page checks the role on the server.
 *
 * @returns The admin link.
 */
export function AdminChip() {
  const t = useTranslations('nav');
  return (
    <Link href="/admin" className="group inline-flex h-11 items-center no-underline">
      <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-bold text-primary-text group-hover:bg-muted">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        {t('admin')}
      </span>
    </Link>
  );
}
