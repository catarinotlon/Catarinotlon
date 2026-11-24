'use client';

import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/shared/ui/cn';

const TABS = [
  { href: '/admin', key: 'registrations' },
  { href: '/admin/kit-pickup', key: 'kits' },
  { href: '/admin/settings', key: 'settings' },
] as const;

const TEAM_TAB = { href: '/admin/team', key: 'team' } as const;
type Tab = (typeof TABS)[number] | typeof TEAM_TAB;

function activeTab(pathname: string): Tab['href'] {
  if (pathname.startsWith('/admin/kit-pickup')) return '/admin/kit-pickup';
  if (pathname.startsWith('/admin/settings')) return '/admin/settings';
  if (pathname.startsWith('/admin/team')) return '/admin/team';
  return '/admin';
}

/** Props of {@link AdminTabs}. */
export interface AdminTabsProps {
  /** Shows the admin team tab, which only owners may open. */
  showTeam?: boolean;
}

/**
 * The admin navigation, marking the current section.
 *
 * @param props - Whether to show the admin team tab.
 * @returns The tabs.
 */
export function AdminTabs({ showTeam = false }: AdminTabsProps) {
  const t = useTranslations('admin.nav');
  const active = activeTab(usePathname());
  const tabs: readonly Tab[] = showTeam ? [...TABS, TEAM_TAB] : TABS;

  return (
    <div className="border-b border-border bg-background px-5 md:px-10">
      <nav
        aria-label={t('label')}
        className="mx-auto flex max-w-[1200px] gap-4 overflow-x-auto text-base sm:gap-6"
      >
        {tabs.map(({ href, key }) => (
          <Link
            key={href}
            href={href}
            aria-current={href === active ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-12 items-center border-b-3 font-semibold whitespace-nowrap no-underline',
              href === active
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t(key)}
          </Link>
        ))}
      </nav>
    </div>
  );
}
