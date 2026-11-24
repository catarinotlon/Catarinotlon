import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { PageShell } from '@/shared/ui/page-shell';

import { AdminTabs } from './admin-tabs';

/** Props of {@link AdminShell}. */
export interface AdminShellProps {
  /** The page content. */
  children: ReactNode;
  /** The header's session actions. */
  actions?: ReactNode;
  /** Whether the signed-in admin is an owner, who also manages admins. */
  canManageAdmins?: boolean;
}

/**
 * The frame of every admin page, with the admin navigation.
 *
 * @param props - The page content, the session actions, and the owner flag.
 * @returns The admin frame.
 */
export function AdminShell({ children, actions, canManageAdmins = false }: AdminShellProps) {
  const t = useTranslations('admin');

  return (
    <PageShell
      admin
      badge={t('badge')}
      subheader={<AdminTabs showTeam={canManageAdmins} />}
      actions={actions}
    >
      <div data-private>{children}</div>
    </PageShell>
  );
}
