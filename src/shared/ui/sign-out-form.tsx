'use client';

import { useTranslations } from 'next-intl';

import { SubmitButton } from './submit-button';

/** Props of {@link SignOutForm}. */
export interface SignOutFormProps {
  /** The server action that ends the session. */
  action: () => Promise<void>;
  /** Classes for the form, such as when it shows on each screen size. */
  className?: string;
}

/**
 * The sign-out button, which shows that it is working until the session ends.
 *
 * @param props - The sign-out action and optional classes.
 * @returns The form with its button.
 */
export function SignOutForm({ action, className }: SignOutFormProps) {
  const common = useTranslations('common');
  const busy = useTranslations('busy');
  return (
    <form action={action} {...(className ? { className } : {})}>
      <SubmitButton variant="link" pendingLabel={busy('signingOut')}>
        {common('signOut')}
      </SubmitButton>
    </form>
  );
}
