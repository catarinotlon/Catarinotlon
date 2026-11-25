import { getAdminUser, getSignedInUser } from '@/composition';
import { AccountMenu } from '@/shared/ui/account-menu';
import { SignedOutActions } from '@/shared/ui/site-header';

import { signOutAction } from './auth-actions';

/**
 * The header's account actions, which follow the session.
 *
 * @remarks
 * This reads the session on the server, so it is rendered by pages and passed to
 * the header. A signed-in visitor gets the avatar with the account menu, which also
 * signs out; a story covers the header's signed-out default.
 *
 * @param props - `signedOut` hides the sign-in links on pages that do not need them.
 * @returns The account menu, or sign-in and register links.
 */
export async function SessionActions({ signedOut = 'links' }: { signedOut?: 'links' | 'none' }) {
  const [user, admin] = await Promise.all([getSignedInUser(), getAdminUser()]);

  if (!user.ok) {
    if (signedOut === 'none') return null;
    return <SignedOutActions />;
  }

  return <AccountMenu name={user.value.name} isAdmin={admin.ok} signOut={signOutAction} />;
}
