import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { getOwnerUser } from '@/composition';

/**
 * The admin team is "not found" for anyone who is not an owner, added admins
 * included.
 *
 * The check runs here, before the loading skeleton streams, so the response
 * keeps its 404 status. The page and the actions still check the role too.
 */
export default async function AdminTeamLayout({ children }: { children: ReactNode }) {
  if (!(await getOwnerUser()).ok) notFound();
  return children;
}
