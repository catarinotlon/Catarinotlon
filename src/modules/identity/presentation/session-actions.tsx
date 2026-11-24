import { getTranslations } from 'next-intl/server';

import { getSignedInUser } from '@/composition';
import { Link } from '@/i18n/navigation';
import { AccountAvatar } from '@/shared/ui/account-avatar';
import { buttonClasses } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import { SignOutForm } from '@/shared/ui/sign-out-form';

import { signOutAction } from './auth-actions';

const COMPACT_CTA = 'hidden min-h-11 px-4 py-1 text-base sm:inline-flex';

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
  const [user, common] = await Promise.all([getSignedInUser(), getTranslations('common')]);

  if (!user.ok) {
    if (signedOut === 'none') return null;
    return (
      <>
        <Link
          href="/sign-in"
          className={cn(
            buttonClasses({ variant: 'outline' }),
            'hidden min-h-11 rounded-full px-4 py-1 font-display text-base font-extrabold uppercase italic sm:inline-flex',
          )}
        >
          {common('signIn')}
        </Link>
        <Link href="/sign-up" className={cn(buttonClasses({ variant: 'cta' }), COMPACT_CTA)}>
          {common('register')}
        </Link>
      </>
    );
  }

  return (
    <>
      <SignOutForm action={signOutAction} className="hidden sm:block" />
      <AccountAvatar name={user.value.name} />
    </>
  );
}
