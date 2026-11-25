'use client';

import Form from 'next/form';
import { useLocale, useTranslations } from 'next-intl';

import { getPathname } from '@/i18n/navigation';
import { SubmitButton } from '@/shared/ui/submit-button';
import { TextField } from '@/shared/ui/form-fields';

/**
 * Finds a runner on the kit pickup screen by name or bib number.
 *
 * @param props - The current search text.
 * @returns The search form.
 */
export function KitPickupSearch({ query }: { query: string }) {
  const t = useTranslations('admin.kits');
  const busy = useTranslations('busy');
  const locale = useLocale();

  return (
    <Form
      action={getPathname({ href: '/admin/kit-pickup', locale })}
      className="flex flex-col gap-3"
    >
      <TextField
        label={t('search')}
        name="q"
        type="search"
        defaultValue={query}
        autoComplete="off"
      />
      <SubmitButton variant="outline" fullWidth pendingLabel={busy('searching')}>
        {t('searchButton')}
      </SubmitButton>
    </Form>
  );
}
