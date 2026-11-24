import { PageShell } from '@/shared/ui/page-shell';
import { NotFoundScreen } from '@/shared/ui/status-screen';
import { SessionActions } from '@/modules/identity/presentation/session-actions';

export default function LocaleNotFound() {
  return (
    <PageShell width="medium" centered actions={<SessionActions signedOut="none" />}>
      <NotFoundScreen />
    </PageShell>
  );
}
