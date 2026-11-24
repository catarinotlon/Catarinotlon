'use client';

import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';

import { Link } from '@/i18n/navigation';
import { Button, buttonClasses } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import { FormAlert, SelectField, TextField } from '@/shared/ui/form-fields';
import type { FormAction } from '@/shared/ui/form-state';
import { Card } from '@/shared/ui/page-shell';
import { ShirtPreview } from '@/shared/ui/shirt-preview';
import { StatusPill } from '@/shared/ui/status-pill';
import { useStickyForm } from '@/shared/ui/use-sticky-form';

const DISTANCES = ['3K', '5K'] as const;

/** The current values of a registration being edited. */
export interface AdminRegistrationInitial {
  /** The registration's UUID. */
  id: string;
  /** The runner's full name. */
  runnerName: string;
  /** The race distance. */
  distance: '3K' | '5K';
  /** The shirt size. */
  shirtSize: string;
  /** The name on the shirt. */
  shirtName: string;
}

/** Read-only facts shown while editing a registration. */
export interface AdminRegistrationSummary {
  /** The account's name and email, or a note that it has none. */
  account: string;
  /** The payment state. */
  paymentState: 'paid' | 'in_review' | 'pending';
  /** Whether the kit was delivered. */
  kitDelivered: boolean;
  /** The bib number. */
  bibNumber: string;
}

const PAYMENT_TONES = { paid: 'solid', in_review: 'gold', pending: 'outline' } as const;

/** Props of {@link AdminRegistrationForm}. */
export interface AdminRegistrationFormProps {
  /** Whether it edits a registration or creates a manual one. */
  mode: 'edit' | 'new';
  /** Saves the form. */
  action: FormAction;
  /** The shirt sizes on offer. */
  shirtSizes: readonly string[];
  /** The registration being edited. */
  initial?: AdminRegistrationInitial;
  /** What the admin should see about the registration being edited. */
  summary?: AdminRegistrationSummary;
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="m-0 text-right font-bold break-words">{children}</dd>
    </div>
  );
}

/**
 * Corrects a registration, or registers someone by hand.
 *
 * @remarks
 * A size no longer on offer stays selectable, so an unrelated edit cannot lose it.
 *
 * @param props - The mode, the action, the sizes, and the current values.
 * @returns The form.
 */
export function AdminRegistrationForm({
  mode,
  action,
  shirtSizes,
  initial,
  summary,
}: AdminRegistrationFormProps) {
  const t = useTranslations('admin.form');
  const list = useTranslations('admin.list');
  const root = useTranslations();
  const busy = useTranslations('busy');
  const [shirtName, setShirtName] = useState(initial?.shirtName ?? '');
  const { state, formAction, onSubmit, pending } = useStickyForm(action);
  const [distance, setDistance] = useState<'3K' | '5K'>(initial?.distance ?? '5K');
  const sizes =
    initial && !shirtSizes.includes(initial.shirtSize)
      ? [initial.shirtSize, ...shirtSizes]
      : shirtSizes;
  const fieldError = (name: string) => {
    const key = state.fieldErrors?.[name];
    return key ? root(key as never) : undefined;
  };

  const form = (
    <form action={formAction} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {state.formError && <FormAlert>{root(state.formError as never)}</FormAlert>}
      {initial && <input type="hidden" name="registrationId" value={initial.id} />}
      <TextField
        label={t('runnerName')}
        name="runnerName"
        defaultValue={initial?.runnerName ?? ''}
        autoComplete="off"
        error={fieldError('runnerName')}
      />
      <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
        <legend className="mb-1 p-0 font-semibold">{t('distance')}</legend>
        <div className="grid grid-cols-2 gap-3">
          {DISTANCES.map((option) => (
            <label
              key={option}
              className={cn(
                'flex min-h-12 cursor-pointer items-center justify-center rounded-lg border-2 font-heading text-2xl focus-within:outline-3 focus-within:outline-offset-3 focus-within:outline-focus',
                option === distance
                  ? 'border-inverse bg-inverse text-inverse-foreground'
                  : 'border-input-border bg-input text-foreground',
              )}
            >
              <input
                type="radio"
                name="distance"
                value={option}
                checked={option === distance}
                onChange={() => setDistance(option)}
                className="sr-only"
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid items-start gap-4 sm:grid-cols-2">
        <SelectField
          label={t('size')}
          name="shirtSize"
          placeholder={t('chooseSize')}
          options={sizes}
          defaultValue={initial?.shirtSize ?? ''}
          error={fieldError('shirtSize')}
        />
        <TextField
          label={t('shirtName')}
          name="shirtName"
          value={shirtName}
          onChange={(event) => setShirtName(event.target.value)}
          autoComplete="off"
          error={fieldError('shirtName')}
        />
      </div>
      <p className="m-0 rounded-lg bg-muted p-3 text-sm text-foreground">{t('sizeNote')}</p>

      {summary && (
        <dl className="m-0 flex flex-col">
          <SummaryRow label={t('account')}>{summary.account}</SummaryRow>
          <SummaryRow label={t('payment')}>
            <StatusPill tone={PAYMENT_TONES[summary.paymentState]}>
              {list(`state.${summary.paymentState}`)}
            </StatusPill>
          </SummaryRow>
          <SummaryRow label={t('kit')}>
            <StatusPill tone={summary.kitDelivered ? 'solid' : 'outline'}>
              {summary.kitDelivered ? list('kitState.delivered') : list('kitState.waiting')}
            </StatusPill>
          </SummaryRow>
        </dl>
      )}

      {mode === 'new' && (
        <fieldset className="m-0 flex flex-col gap-3 border-0 border-t border-border p-0 pt-4">
          <legend className="float-left mb-3 w-full p-0 font-display text-xl font-bold uppercase">
            {t('contactHeading')}
          </legend>
          <div className="clear-both grid items-start gap-4 sm:grid-cols-2">
            <TextField
              label={t('contactEmail')}
              name="contactEmail"
              type="email"
              autoComplete="off"
            />
            <TextField
              label={t('contactPhone')}
              name="contactPhone"
              type="tel"
              autoComplete="off"
            />
          </div>
          <label className="flex min-h-11 items-start gap-3">
            <input
              type="checkbox"
              name="paymentReceived"
              className="mt-1 size-5 shrink-0 accent-primary"
            />
            <span>
              <span className="block font-semibold">{t('paymentReceived')}</span>
              <span className="block text-sm text-muted-foreground">
                {t('paymentReceivedHelp')}
              </span>
            </span>
          </label>
        </fieldset>
      )}

      {state.done && (
        <p role="status" className="m-0 font-semibold">
          {t('saved')}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          variant="cta"
          pending={pending}
          pendingLabel={busy('saving')}
          className="flex-1"
        >
          {mode === 'edit' ? t('save') : t('create')}
        </Button>
        <Link href="/admin" className={cn(buttonClasses({ variant: 'outline' }), 'rounded-full')}>
          {t('cancel')}
        </Link>
      </div>
    </form>
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
      <Card>{form}</Card>
      <Card className="flex flex-col gap-4">
        <div className="mx-auto w-full max-w-56">
          <ShirtPreview name={shirtName} />
        </div>
        <dl className="m-0 flex flex-col">
          <SummaryRow label={t('bib')}>{summary?.bibNumber ?? t('bibOnSave')}</SummaryRow>
          <SummaryRow label={t('distance')}>{distance}</SummaryRow>
        </dl>
      </Card>
    </div>
  );
}
