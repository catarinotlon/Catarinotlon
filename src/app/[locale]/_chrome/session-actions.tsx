import { signOutAction } from '@/modules/identity/presentation/auth-actions';
import { AccountMenu } from '@/shared/ui/account-menu';
import { AdminChip } from '@/shared/ui/admin-chip';
import { SignedOutActions } from '@/shared/ui/site-header';

import { loadHeaderSession } from './session';

/**
 * The header's account actions on wide screens, which follow the session.
 *
 * @remarks
 * A signed-in visitor gets the account button with its menu, and an admin also the admin
 * chip. A visitor without a session gets the sign-in and register links, unless the page
 * asks for none.
 *
 * @param props - `signedOut` hides the sign-in links on pages that do not need them.
 * @returns The account actions.
 */
export async function SessionActions({ signedOut = 'links' }: { signedOut?: 'links' | 'none' }) {
  const { isAdmin, account } = await loadHeaderSession();

  if (!account) return signedOut === 'none' ? null : <SignedOutActions />;

  return (
    <>
      {isAdmin && <AdminChip />}
      <AccountMenu account={account} signOut={signOutAction} />
    </>
  );
}
