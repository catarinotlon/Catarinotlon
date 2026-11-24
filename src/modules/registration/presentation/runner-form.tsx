'use client';

import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/ui/button';
import { FormAlert, TextField } from '@/shared/ui/form-fields';
import type { FormAction } from '@/shared/ui/form-state';
import { Card, DottedStage, SplitLayout } from '@/shared/ui/page-shell';
import { RegistrationSteps } from '@/shared/ui/registration-steps';
import { ShirtPreview } from '@/shared/ui/shirt-preview';
import { useStickyForm } from '@/shared/ui/use-sticky-form';

import { RunnerFields } from './runner-fields';

/** Props of {@link RunnerForm}. */
export interface RunnerFormProps {
  /** Saves the runner. */
  action: FormAction;
  /** The shirt sizes on offer. */
  shirtSizes: readonly string[];
  /** The main button's label. */
  submitLabel: string;
  /** The label of the button that saves and adds another runner. */
  anotherLabel: string;
  /** The prefilled runner name. */
  defaultRunnerName: string;
  /** Help text for the runner's name. */
  runnerHelp: string;
  /** Whether to ask for the account holder's phone. */
  askPhone?: boolean;
  /** Whether to ask for acceptance of the legal documents. */
  askConsent?: boolean;
  /** The page's introduction, shown beside the form with the live shirt. */
  intro?: ReactNode;
  /** Whether to show the "step 2 of 3" stepper. */
  showSteps?: boolean;
  /** The formatted registration fee. */
  fee?: string;
  /** Replaces the note about what can change later. */
  changesNote?: string;
}

/**
 * Registers a runner under the signed-in account.
 *
 * @param props - The action, the sizes, the labels, and what to ask for.
 * @returns The form.
 */
export function RunnerForm({
  action,
  shirtSizes,
  submitLabel,
  anotherLabel,
  defaultRunnerName,
  runnerHelp,
  askPhone = false,
  askConsent = false,
  intro,
  showSteps = false,
  fee,
  changesNote,
}: RunnerFormProps) {
  const t = useTranslations('registrationForm');
  const auth = useTranslations('auth');
  const root = useTranslations();
  const preview = useTranslations('shirt');
  const { state, formAction, onSubmit, pending } = useStickyForm(action);
  const [shirtName, setShirtName] = useState('');
  const [distance, setDistance] = useState<'3K' | '5K'>('5K');
  const fieldError = (name: string) => {
    const key = state.fieldErrors?.[name];
    return key ? root(key as never) : undefined;
  };

  const phoneField = askPhone ? (
    <TextField
      label={auth('phone')}
      name="phone"
      type="tel"
      autoComplete="tel"
      error={fieldError('phone')}
    />
  ) : undefined;

  const form = (
    <form action={formAction} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {showSteps && <RegistrationSteps current="race" />}
      {state.formError && <FormAlert>{root(state.formError as never)}</FormAlert>}
      <RunnerFields
        shirtSizes={shirtSizes}
        errors={state.fieldErrors ?? {}}
        showRunnerName
        defaultRunnerName={defaultRunnerName}
        runnerHelp={runnerHelp}
        showPreview={!intro}
        onShirtNameChange={setShirtName}
        onDistanceChange={setDistance}
        stacked={!askPhone && Boolean(intro)}
        {...(fee ? { fee } : {})}
        {...(phoneField ? { besideSize: phoneField } : {})}
      />
      {askConsent && (
        <div className="flex flex-col gap-1">
          <label className="flex min-h-11 items-start gap-3">
            <input
              type="checkbox"
              name="acceptLegal"
              className="mt-1 size-5 shrink-0 accent-primary"
            />
            <span>
              {t('acceptPrefix')}{' '}
              <Link
                href="/terms"
                target="_blank"
                className="font-semibold underline underline-offset-2"
              >
                {t('terms')}
              </Link>{' '}
              {t('and')}{' '}
              <Link
                href="/privacy"
                target="_blank"
                className="font-semibold underline underline-offset-2"
              >
                {t('privacy')}
              </Link>
              .
            </span>
          </label>
          {fieldError('acceptLegal') && (
            <p className="m-0 text-sm font-semibold text-primary-text">
              {fieldError('acceptLegal')}
            </p>
          )}
        </div>
      )}
      <Button type="submit" name="intent" value="pay" variant="cta" fullWidth disabled={pending}>
        {intro ? t('submitWithDistance', { label: submitLabel, distance }) : submitLabel}
      </Button>
      <Button
        type="submit"
        name="intent"
        value="another"
        variant="outline"
        fullWidth
        disabled={pending}
        className="rounded-full border-dashed"
      >
        {anotherLabel}
      </Button>
      <p className="m-0 text-sm text-muted-foreground">{changesNote ?? t('changesNote')}</p>
    </form>
  );

  if (!intro) return form;

  return (
    <SplitLayout
      aside={
        <>
          {intro}
          <DottedStage className="relative flex justify-center">
            <div className="w-full max-w-64">
              <ShirtPreview name={shirtName} />
            </div>
            <span className="absolute bottom-3 rounded-full bg-ink px-4 py-1 text-sm font-bold text-primary-foreground">
              {preview('previewBadge')}
            </span>
          </DottedStage>
        </>
      }
    >
      <Card>{form}</Card>
    </SplitLayout>
  );
}
