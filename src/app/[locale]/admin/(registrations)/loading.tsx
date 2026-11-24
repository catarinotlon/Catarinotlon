import { LoadingShell, AdminListSkeleton } from '@/shared/ui/skeleton';

/** Shown at once while this page loads its data. */
export default function Loading() {
  return (
    <LoadingShell admin>
      <AdminListSkeleton />
    </LoadingShell>
  );
}
