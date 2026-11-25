import type { ReactNode } from 'react';

import { PageShell } from '@/shared/ui/page-shell';

import { AdminTabs } from './admin-tabs';

/** Props of {@link AdminShell}. */
export interface AdminShellProps {
  /** The page content. */
  children: ReactNode;
  /** The site navigation, the same as on every other page. */
  navigation?: ReactNode;
  /** The header's session actions. */
  actions?: ReactNode;
  /** Whether the signed-in admin is an owner, who also manages admins. */
  canManageAdmins?: boolean;
}

/**
 * The frame of every admin page: the site header, and the admin navigation under it.
 *
 * @remarks
 * The header is the same as on every other page, so an admin finds the menu, the theme,
 * and the account in the same place everywhere.
 *
 * @param props - The page content, the site navigation, the session actions, and the owner flag.
 * @returns The admin frame.
 */
export function AdminShell({
  children,
  navigation,
  actions,
  canManageAdmins = false,
}: AdminShellProps) {
  return (
    <PageShell
      admin
      navigation={navigation}
      subheader={<AdminTabs showTeam={canManageAdmins} />}
      actions={actions}
    >
      <div data-private>{children}</div>
    </PageShell>
  );
}
