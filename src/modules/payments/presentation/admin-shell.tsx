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
}

/**
 * The frame of every admin page, with the admin navigation.
 *
 * @param props - The page content and the session actions.
 * @returns The admin frame.
 */
export function AdminShell({ children, actions }: AdminShellProps) {
  const t = useTranslations('admin');

  return (
    <PageShell admin badge={t('badge')} subheader={<AdminTabs />} actions={actions}>
      {children}
    </PageShell>
  );
}
