'use client';

import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';

import { Button } from '@/shared/ui/button';
import { FormAlert, SelectField, TextField } from '@/shared/ui/form-fields';
import type { FormAction, FormState } from '@/shared/ui/form-state';
import { ShirtPreview } from '@/shared/ui/shirt-preview';
import { useStickyForm } from '@/shared/ui/use-sticky-form';

function Feedback({ state, success }: { state: FormState; success: string }) {
  const root = useTranslations();
  return (
    <>
      {state.formError && <FormAlert>{root(state.formError as never)}</FormAlert>}
      {state.done && (
        <p role="status" className="m-0 font-semibold">
          {success}
        </p>
      )}
    </>
  );
}

/** Props of {@link AccountDetailsEditor}. */
export interface AccountDetailsEditorProps {
  /** The holder's name. */
  name: string;
  /** The holder's phone. */
  phone: string | null;
  /** Saves both. */
  action: FormAction;
  /** The section heading. */
  title: string;
  /** The read-only view of the details. */
  children: ReactNode;
}

/**
 * Shows the account holder's details, with a form to correct them.
 *
 * @param props - The current values, the action, and the read-only view.
 * @returns The editor.
 */
export function AccountDetailsEditor({
  name,
  phone,
  action,
  title,
  children,
}: AccountDetailsEditorProps) {
  const t = useTranslations('account');
  const root = useTranslations();
  const busy = useTranslations('busy');
  const [editing, setEditing] = useState(false);
  const { state, formAction, onSubmit, pending } = useStickyForm(async (previous, data) => {
    const result = await action(previous, data);
    if (result.done) setEditing(false);
    return result;
  });
  const fieldError = (field: string) => {
    const key = state.fieldErrors?.[field];
    return key ? { error: root(key as never) } : {};
  };

  const heading = <h3 className="m-0 font-heading text-3xl">{title}</h3>;

  if (!editing) {
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {heading}
          <Button type="button" variant="outline" onClick={() => setEditing(true)}>
            {t('editData')}
          </Button>
        </div>
        {children}
        {state.done && (
          <p role="status" className="m-0 font-semibold">
            {t('dataSaved')}
          </p>
        )}
      </>
    );
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {heading}
      {state.formError && <FormAlert>{root(state.formError as never)}</FormAlert>}
      <TextField
        label={t('name')}
        name="name"
        autoComplete="name"
        defaultValue={name}
        {...fieldError('name')}
      />
      <TextField
        label={t('phone')}
        name="phone"
        type="tel"
        autoComplete="tel"
        defaultValue={phone ?? ''}
        {...fieldError('phone')}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="inverse" pending={pending} pendingLabel={busy('saving')}>
          {t('saveData')}
        </Button>
        <Button type="button" variant="outline" onClick={() => setEditing(false)}>
          {t('cancel')}
        </Button>
      </div>
    </form>
  );
}

/** Props of {@link ShirtNameEditor}. */
export interface ShirtNameEditorProps {
  /** The registration being edited. */
  registrationId: string;
  /** The current shirt name. */
  shirtName: string;
  /** Saves the name. */
  action: FormAction;
}

/**
 * Edits the selected runner's shirt name with a live preview.
 *
 * @param props - The registration, its name, and the action.
 * @returns The editor.
 */
export function ShirtNameEditor({ registrationId, shirtName, action }: ShirtNameEditorProps) {
  const t = useTranslations('account');
  const root = useTranslations();
  const busy = useTranslations('busy');
  const [name, setName] = useState(shirtName);
  const { state, formAction, onSubmit, pending } = useStickyForm(action);
  const errorKey = state.fieldErrors?.shirtName;

  return (
    <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
      <ShirtPreview name={name} />
      <form action={formAction} onSubmit={onSubmit} className="flex flex-col gap-3">
        <input type="hidden" name="registrationId" value={registrationId} />
        <TextField
          label={t('shirtName')}
          name="shirtName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
          error={errorKey ? root(errorKey as never) : undefined}
        />
        <Button type="submit" variant="cta" pending={pending} pendingLabel={busy('saving')}>
          {t('saveName')}
        </Button>
        <Feedback state={state} success={t('nameSaved')} />
      </form>
    </div>
  );
}

/** Props of {@link SettingForm}. */
export interface SettingFormProps {
  /** The registration being edited. */
  registrationId: string;
  /** The field label. */
  label: string;
  /** The form field name. */
  name: string;
  /** The values on offer. */
  options: readonly string[];
  /** The current value. */
  value: string;
  /** The submit button's label. */
  submitLabel: string;
  /** The confirmation shown after saving. */
  success: string;
  /** Saves the value. */
  action: FormAction;
  /** Extra content below the form. */
  children?: ReactNode;
}

/**
 * Changes one of the selected runner's options, such as distance or size.
 *
 * @param props - The registration, the options, and the action.
 * @returns The form.
 */
export function SettingForm({
  registrationId,
  label,
  name,
  options,
  value,
  submitLabel,
  success,
  action,
  children,
}: SettingFormProps) {
  const busy = useTranslations('busy');
  const { state, formAction, onSubmit, pending } = useStickyForm(action);

  return (
    <form action={formAction} onSubmit={onSubmit} className="flex flex-col gap-2">
      <input type="hidden" name="registrationId" value={registrationId} />
      <SelectField
        key={value}
        label={label}
        name={name}
        placeholder={label}
        options={options}
        defaultValue={value}
      />
      <Button type="submit" variant="outline" pending={pending} pendingLabel={busy('saving')}>
        {submitLabel}
      </Button>
      <Feedback state={state} success={success} />
      {children}
    </form>
  );
}
