'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';

import { Link } from '@/i18n/navigation';
import { IconBadge } from '@/shared/ui/status-pill';
import { Button, buttonClasses } from '@/shared/ui/button';
import { INITIAL_FORM_STATE, type FormState } from '@/shared/ui/form-state';

/** Props of {@link VerifyEmailPanel}. */
export interface VerifyEmailPanelProps {
  /** The address waiting to be verified, when known. */
  email: string | null;
  /** Whether the runner just opened the verification link. */
  verified: boolean;
  /** Sends the verification email again. */
  resendAction: (state: FormState) => Promise<FormState>;
}

/**
 * Asks the runner to confirm their email, or confirms that they did.
 *
 * @param props - The address, the verified state, and the resend action.
 * @returns The panel.
 */
export function VerifyEmailPanel({ email, verified, resendAction }: VerifyEmailPanelProps) {
  const t = useTranslations('auth.verify');
  const busy = useTranslations('busy');
  const [state, formAction, pending] = useActionState(resendAction, INITIAL_FORM_STATE);

  if (verified) {
    return (
      <div className="flex flex-col gap-4">
        <IconBadge icon="check" />
        <h1 className="m-0 font-heading text-[clamp(36px,9vw,44px)]">{t('doneTitle')}</h1>
        <p className="m-0 text-muted-foreground">{t('doneBody')}</p>
        <Link href="/payment" className={buttonClasses({ variant: 'cta', fullWidth: true })}>
          {t('doneCta')}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <IconBadge icon="mail" />
      <h1 className="m-0 font-heading text-[clamp(36px,9vw,44px)]">{t('title')}</h1>
      <p data-private className="m-0 text-muted-foreground">
        {email ? t('body', { email }) : t('bodyGeneric')}
      </p>
      <form action={formAction}>
        <Button
          type="submit"
          variant="cta"
          fullWidth
          pending={pending}
          pendingLabel={busy('resending')}
          className="bg-inverse text-inverse-foreground"
        >
          {t('resend')}
        </Button>
      </form>
      {state.done && (
        <p role="status" className="m-0 font-semibold">
          {t('resent')}
        </p>
      )}
      <p className="m-0 rounded-lg bg-muted p-3 text-sm text-foreground">{t('help')}</p>
      <Link
        href="/sign-up"
        className="inline-flex min-h-11 items-center self-center font-semibold underline underline-offset-2"
      >
        {t('otherEmail')}
      </Link>
    </div>
  );
}
