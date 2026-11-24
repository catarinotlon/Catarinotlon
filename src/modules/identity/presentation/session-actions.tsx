import { getSignedInUser } from '@/composition';
import { AccountAvatar } from '@/shared/ui/account-avatar';
import { SignOutForm } from '@/shared/ui/sign-out-form';
import { SignedOutActions } from '@/shared/ui/site-header';

import { signOutAction } from './auth-actions';

/**
 * The header's account actions, which follow the session.
 *
 * @remarks
 * This reads the session on the server, so it is rendered by pages and passed to
 * the header. A story covers the header's signed-out default.
 *
 * @param props - `signedOut` hides the sign-in links on pages that do not need them.
 * @returns The avatar and sign-out, or sign-in and register links.
 */
export async function SessionActions({ signedOut = 'links' }: { signedOut?: 'links' | 'none' }) {
  const user = await getSignedInUser();

  if (!user.ok) {
    if (signedOut === 'none') return null;
    return <SignedOutActions />;
  }

  return (
    <>
      <SignOutForm action={signOutAction} className="hidden sm:block" />
      <AccountAvatar name={user.value.name} />
    </>
  );
}
