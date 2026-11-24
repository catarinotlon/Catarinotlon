import { PageShell } from '@/shared/ui/page-shell';
import { AdminDetailSkeleton } from '@/shared/ui/skeleton';

/** Shown at once while this page loads its data. */
export default function Loading() {
  return (
    <PageShell admin>
      <AdminDetailSkeleton />
    </PageShell>
  );
}
