import { LandingNav } from '@/modules/event/presentation';
import { signOutAction } from '@/modules/identity/presentation/auth-actions';

import { loadHeaderSession } from './session';

/**
 * The site navigation for every page: on the landing page its section links are in-page
 * anchors, elsewhere they lead back to the landing page, and the phone menu follows the
 * session.
 *
 * @param props - Whether this is the landing page.
 * @returns The site navigation.
 */
export async function SiteNavigation({ onLanding = false }: { onLanding?: boolean }) {
  const { isAdmin, account } = await loadHeaderSession();
  return (
    <LandingNav
      onLanding={onLanding}
      isAdmin={isAdmin}
      account={account}
      {...(account ? { signOut: signOutAction } : {})}
    />
  );
}
