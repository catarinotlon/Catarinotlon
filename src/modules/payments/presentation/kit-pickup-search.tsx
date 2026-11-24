'use client';

import Form from 'next/form';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { getPathname, usePathname, useRouter } from '@/i18n/navigation';
import { SubmitButton } from '@/shared/ui/submit-button';
import { TextField } from '@/shared/ui/form-fields';

import { TicketScanner } from './ticket-scanner';

/**
 * Finds a runner on the kit pickup screen, by QR code or by name or bib number.
 *
 * @param props - The current search text.
 * @returns The search controls.
 */
export function KitPickupSearch({ query }: { query: string }) {
  const t = useTranslations('admin.kits');
  const busy = useTranslations('busy');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const showTicket = useCallback(
    (ticket: string) => {
      router.replace({ pathname: pathname as '/admin/kit-pickup', query: { ticket } });
    },
    [router, pathname],
  );

  return (
    <div className="flex flex-col gap-4">
      <TicketScanner onTicket={showTicket} />
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
    </div>
  );
}
