import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { getAdminUser } from '@/composition';

/**
 * Admin routes are "not found" for anyone who is not an admin.
 *
 * The check runs here, before the loading skeleton streams, so the response
 * keeps its 404 status. Each page and use case still checks the role too.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await getAdminUser()).ok) notFound();
  return children;
}
