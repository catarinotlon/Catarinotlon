'use client';

import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';

import { cn } from '@/shared/ui/cn';
import { SelectField, TextField } from '@/shared/ui/form-fields';
import { ShirtPreview } from '@/shared/ui/shirt-preview';

const DISTANCES = ['3K', '5K'] as const;

/** Props of {@link RunnerFields}. */
export interface RunnerFieldsProps {
  /** The shirt sizes on offer. */
  shirtSizes: readonly string[];
  /** Field errors, as message keys. */
  errors: Readonly<Record<string, string>>;
  /** Whether to ask for the runner's name. */
  showRunnerName?: boolean;
  /** The prefilled runner name. */
  defaultRunnerName?: string;
  /** Help text for the runner's name. */
  runnerHelp?: string;
  /** Called when the distance changes. */
  onDistanceChange?: (distance: '3K' | '5K') => void;
  /** Called when the shirt name changes, for a preview outside these fields. */
  onShirtNameChange?: (name: string) => void;
  /** Whether to show the shirt preview under the fields. */
  showPreview?: boolean;
  /** The formatted registration fee, shown under the distance. */
  fee?: string;
  /** A field shown next to the size. Without it, the shirt name goes there. */
  besideSize?: ReactNode;
  /** Stacks the size and the shirt name. */
  stacked?: boolean;
}

/**
 * The race details shared by the sign-up and registration forms.
 *
 * @param props - The sizes, errors, and runner name options.
 * @returns The fields, with a live shirt preview.
 */
export function RunnerFields({
  shirtSizes,
  errors,
  showRunnerName = false,
  defaultRunnerName = '',
  runnerHelp,
  onDistanceChange,
  onShirtNameChange,
  showPreview = true,
  fee,
  besideSize,
  stacked = false,
}: RunnerFieldsProps) {
  const t = useTranslations('registrationForm');
  const root = useTranslations();
  const [distance, setDistance] = useState<(typeof DISTANCES)[number]>('5K');
  const [shirtName, setShirtName] = useState('');
  const message = (field: string) => {
    const key = errors[field];
    return key ? root(key as never) : undefined;
  };
  const shirtNameField = (
    <TextField
      label={t('shirtName')}
      name="shirtName"
      value={shirtName}
      onChange={(event) => {
        setShirtName(event.target.value);
        onShirtNameChange?.(event.target.value);
      }}
      autoComplete="off"
      error={message('shirtName')}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      {showRunnerName && (
        <TextField
          label={t('runnerName')}
          name="runnerName"
          defaultValue={defaultRunnerName}
          autoComplete="name"
          error={message('runnerName')}
          {...(runnerHelp ? { help: runnerHelp } : {})}
        />
      )}

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
                onChange={() => {
                  setDistance(option);
                  onDistanceChange?.(option);
                }}
                className="sr-only"
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>

      {fee && (
        <p className="m-0 flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
          <span>{t('feeLabel')}</span>
          <strong className="text-foreground">{fee}</strong>
        </p>
      )}

      <div className={cn('grid items-start gap-4', !stacked && 'sm:grid-cols-2')}>
        <SelectField
          label={t('shirtSize')}
          name="shirtSize"
          placeholder={t('chooseSize')}
          options={shirtSizes}
          error={message('shirtSize')}
        />
        {besideSize ?? shirtNameField}
      </div>
      {besideSize && shirtNameField}

      {showPreview && (
        <div className="mx-auto w-full max-w-56">
          <ShirtPreview name={shirtName} />
        </div>
      )}
    </div>
  );
}
