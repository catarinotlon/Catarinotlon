'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/shared/ui/button';
import { FormAlert } from '@/shared/ui/form-fields';
import type { FormAction } from '@/shared/ui/form-state';
import { useStickyForm } from '@/shared/ui/use-sticky-form';

/** Props of {@link RemoveRunnerButton}. */
export interface RemoveRunnerButtonProps {
  /** The registration's UUID. */
  registrationId: string;
  /** The runner's full name, shown in the question and the button's label. */
  runnerName: string;
  /** The page to return to once the runner is removed. */
  from: 'payment' | 'account';
  /** Removes the runner in the submitted `registrationId`. */
  action: FormAction;
  /** Extra classes for the wrapper. */
  className?: string;
}

/**
 * Removes an unpaid runner added by mistake, after asking first.
 *
 * @remarks
 * The first press only opens the question with "Yes, remove" and "Cancel"; the
 * runner is removed only after confirming. Only render it for a runner still
 * waiting for payment: the server refuses any other. The runner's name is
 * masked in recordings.
 *
 * @param props - The runner, the page to return to, and the action.
 * @returns The button, or the confirmation.
 */
export function RemoveRunnerButton({
  registrationId,
  runnerName,
  from,
  action,
  className,
}: RemoveRunnerButtonProps) {
  const t = useTranslations('removeRunner');
  const busy = useTranslations('busy');
  const root = useTranslations();
  const { state, formAction, onSubmit, pending } = useStickyForm(action);
  const [confirming, setConfirming] = useState(false);
  const opened = useRef(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (opened.current) wrapper.current?.querySelector('button')?.focus();
  }, [confirming]);

  if (!confirming) {
    return (
      <div ref={wrapper} className={className}>
        <Button
          variant="link"
          className="min-h-11 text-sm text-muted-foreground"
          aria-label={t('label', { name: runnerName })}
          onClick={() => {
            opened.current = true;
            setConfirming(true);
          }}
        >
          {t('button')}
        </Button>
      </div>
    );
  }

  return (
    <div ref={wrapper} className={className}>
      <form
        action={formAction}
        onSubmit={onSubmit}
        data-private
        className="flex flex-col gap-3 rounded-lg border-2 border-border p-3"
      >
        <input type="hidden" name="registrationId" value={registrationId} />
        <input type="hidden" name="from" value={from} />
        <p className="m-0 font-bold break-words">{t('question', { name: runnerName })}</p>
        <p className="m-0 text-sm text-muted-foreground">{t('body')}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" pending={pending} pendingLabel={busy('removing')}>
            {t('confirm')}
          </Button>
          <Button variant="outline" disabled={pending} onClick={() => setConfirming(false)}>
            {t('cancel')}
          </Button>
        </div>
        {state.formError && <FormAlert>{root(state.formError as never)}</FormAlert>}
      </form>
    </div>
  );
}
