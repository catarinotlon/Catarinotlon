'use client';

import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';

import { ShirtPreview } from '@/shared/ui/shirt-preview';

/**
 * Lets a visitor preview a name on the shirt. Nothing is saved.
 *
 * @param props - An optional heading beside the preview.
 * @returns The try-on control and its preview.
 */
export function ShirtTryOn({ title }: { title?: string }) {
  const t = useTranslations('landing.signup');
  const inputId = useId();
  const helpId = useId();
  const [name, setName] = useState('');

  return (
    <div className="grid items-center gap-4 sm:grid-cols-2">
      <div className="mx-auto w-full max-w-64">
        <ShirtPreview name={name} />
      </div>
      <div className="flex flex-col gap-1">
        {title && <h3 className="m-0 mb-2 font-heading text-3xl">{title}</h3>}
        <label htmlFor={inputId} className="font-semibold">
          {t('tryOnLabel')}
        </label>
        <input
          id={inputId}
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-describedby={helpId}
          autoComplete="off"
          className="min-h-11 w-full rounded-lg border-2 border-input-border bg-input px-3 text-foreground"
        />
        <p id={helpId} className="m-0 text-sm text-muted-foreground">
          {t('tryOnHelp')}
        </p>
      </div>
    </div>
  );
}
