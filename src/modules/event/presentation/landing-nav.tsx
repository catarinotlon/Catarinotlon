'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';

import { getPathname } from '@/i18n/navigation';
import { SiteMenu, type MenuAccount } from '@/shared/ui/site-menu';

import { LANDING_SECTIONS as SECTIONS } from './landing-sections';

function icon(children: ReactNode) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const SECTION_ICONS: Record<(typeof SECTIONS)[number]['key'], ReactNode> = {
  distances: icon(
    <>
      <path d="M4 19c4 0 4-6 8-6s4 6 8 6" />
      <circle cx="12" cy="6" r="2.5" />
    </>,
  ),
  kit: icon(<path d="M8 4l-4 3 2 4 2-1v10h8V10l2 1 2-4-4-3c0 2-2 3-4 3S8 6 8 4Z" />),
  raceDay: icon(
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>,
  ),
  faq: icon(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6M12 17h.01" />
    </>,
  ),
};

type SectionKey = (typeof SECTIONS)[number]['key'];

/**
 * Follows which landing section is in the middle of the screen.
 *
 * @param enabled - Whether the sections are on this page.
 * @returns The key of the section in view, or `null` above the first one.
 */
function useSectionInView(enabled: boolean): SectionKey | null {
  const [current, setCurrent] = useState<SectionKey | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const targets = SECTIONS.flatMap(({ href, key }) => {
      const element = document.getElementById(href.slice(1));
      return element ? [{ key, element }] : [];
    });
    const inView = new Set<SectionKey>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = targets.find((item) => item.element === entry.target);
          if (!target) continue;
          if (entry.isIntersecting) inView.add(target.key);
          else inView.delete(target.key);
        }
        setCurrent(targets.find((item) => inView.has(item.key))?.key ?? null);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    for (const { element } of targets) observer.observe(element);
    return () => observer.disconnect();
  }, [enabled]);

  return current;
}

/** Props of {@link LandingNav}. */
export interface LandingNavProps {
  /** The signed-in account. Without one, the menu offers sign-in and registration. */
  account?: MenuAccount | null;
  /** The server action that ends the session, offered in the menu to a signed-in visitor. */
  signOut?: () => Promise<void>;
  /** Whether the visitor is an admin, who also gets a link to the panel. */
  isAdmin?: boolean;
  /** Whether it is rendered on the landing page itself, where the links are in-page anchors. */
  onLanding?: boolean;
}

/**
 * The site navigation: links to the landing page's sections, inline on wide screens and
 * in a menu on narrow ones.
 *
 * @remarks
 * Every page shows it. On the landing page the links are in-page anchors, and the link of
 * the section in the middle of the screen is marked current; elsewhere they lead back to
 * those sections. On wide screens an admin reaches the panel from the header's admin chip.
 * On narrow screens the links, and the admin link, live in the {@link SiteMenu} drawer,
 * together with everything the header has no room for: the theme and language switches and
 * either the sign-in links or the account.
 *
 * @param props - The visitor's account and role, and whether this is the landing page.
 * @returns The navigation.
 */
export function LandingNav({
  account = null,
  signOut,
  isAdmin = false,
  onLanding = true,
}: LandingNavProps) {
  const t = useTranslations('nav');
  const locale = useLocale();
  const home = onLanding ? '' : getPathname({ locale, href: '/' });
  const current = useSectionInView(onLanding);

  return (
    <>
      <nav aria-label={t('main')} className="hidden items-center xl:flex">
        {SECTIONS.map(({ href, key }) => (
          <a
            key={key}
            href={`${home}${href}`}
            {...(current === key ? { 'aria-current': 'true' as const } : {})}
            className="relative inline-flex h-18 items-center px-3 text-base font-semibold whitespace-nowrap text-muted-foreground no-underline after:absolute after:inset-x-3 after:bottom-3.5 after:h-[3px] after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity hover:text-foreground aria-[current]:font-bold aria-[current]:text-foreground aria-[current]:after:opacity-100 motion-reduce:after:transition-none"
          >
            {t(key)}
          </a>
        ))}
      </nav>

      <div className="order-last xl:hidden">
        <SiteMenu
          sections={SECTIONS.map(({ href, key }) => ({
            href: `${home}${href}`,
            label: t(key),
            icon: SECTION_ICONS[key],
          }))}
          isAdmin={isAdmin}
          account={account}
          {...(signOut ? { signOut } : {})}
        />
      </div>
    </>
  );
}
