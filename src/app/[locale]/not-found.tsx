import { PageShell } from '@/shared/ui/page-shell';
import { NotFoundScreen } from '@/shared/ui/status-screen';
import { SessionActions } from '@/app/[locale]/_chrome/session-actions';

import { SiteNavigation } from './_chrome/site-navigation';

export default function LocaleNotFound() {
  return (
    <PageShell
      width="medium"
      centered
      navigation={<SiteNavigation />}
      actions={<SessionActions signedOut="none" />}
    >
      <NotFoundScreen />
    </PageShell>
  );
}
