import Form from 'next/form';
import { useLocale, useTranslations } from 'next-intl';

import { getPathname, Link } from '@/i18n/navigation';
import { buttonClasses } from '@/shared/ui/button';
import { Card } from '@/shared/ui/page-shell';
import { StatusPill } from '@/shared/ui/status-pill';
import { SubmitButton } from '@/shared/ui/submit-button';

import type {
  AdminRow,
  AdminRowFilter,
  AdminTotals,
} from '../application/use-cases/admin-overview';

/** Props of {@link RegistrationsTable}. */
export interface RegistrationsTableProps {
  /** The rows after filtering. */
  rows: readonly AdminRow[];
  /** The counts over every registration. */
  totals: AdminTotals;
  /** The active filters. */
  filter: AdminRowFilter;
  /** How many registrations exist before filtering. */
  totalRows: number;
}

const PAYMENT_TONES = { paid: 'solid', in_review: 'gold', pending: 'outline' } as const;

const SELECT_CLASSES =
  'min-h-11 w-full rounded-lg border-2 border-input-border bg-input px-2 text-foreground';

function FilterSelect({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string | undefined;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <label className="flex flex-col gap-1 font-semibold">
      {label}
      <select name={name} defaultValue={value ?? ''} className={SELECT_CLASSES}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * The admin's registrations: counts, filters, exports, and the table.
 *
 * @remarks
 * Filters submit as a plain GET form, so a filtered view can be reloaded. Names
 * are untrusted and rendered as text.
 *
 * @param props - The rows, the totals, and the filters.
 * @returns The view.
 */
export function RegistrationsTable({ rows, totals, filter, totalRows }: RegistrationsTableProps) {
  const t = useTranslations('admin.list');
  const busy = useTranslations('busy');
  const locale = useLocale();
  const counts = [
    [t('totalRegistered'), totals.total],
    ['3K', totals.three],
    ['5K', totals.five],
    [t('inReview'), totals.inReview],
    [t('pending'), totals.pending],
    [t('kitsDelivered'), totals.kitsDelivered],
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 font-heading text-5xl">{t('title')}</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/registrations/new" className={buttonClasses()}>
            {t('add')}
          </Link>
          <a
            href="/api/admin/exports/registrations"
            className={buttonClasses({ variant: 'outline' })}
          >
            {t('exportRegistrations')}
          </a>
          <a href="/api/admin/exports/shirts" className={buttonClasses({ variant: 'inverse' })}>
            {t('exportShirts')}
          </a>
        </div>
      </div>

      <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {counts.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-surface p-4">
            <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
            <dd className="m-0 font-heading text-3xl">{value}</dd>
          </div>
        ))}
      </dl>

      <div>
        <Form
          action={getPathname({ href: '/admin', locale })}
          className="grid items-end gap-3 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]"
        >
          <label className="flex flex-col gap-1 font-semibold">
            {t('search')}
            <input
              type="search"
              name="q"
              defaultValue={filter.query ?? ''}
              className={SELECT_CLASSES}
            />
          </label>
          <FilterSelect
            label={t('distance')}
            name="distance"
            value={filter.distance}
            options={[
              ['', t('all')],
              ['3K', '3K'],
              ['5K', '5K'],
            ]}
          />
          <FilterSelect
            label={t('payment')}
            name="payment"
            value={filter.payment}
            options={[
              ['', t('allMasculine')],
              ['paid', t('state.paid')],
              ['in_review', t('state.in_review')],
              ['pending', t('state.pending')],
            ]}
          />
          <FilterSelect
            label={t('kit')}
            name="kit"
            value={filter.kit}
            options={[
              ['', t('allMasculine')],
              ['delivered', t('kitState.delivered')],
              ['waiting', t('kitState.waiting')],
            ]}
          />
          <SubmitButton variant="inverse" pendingLabel={busy('searching')}>
            {t('searchButton')}
          </SubmitButton>
        </Form>
      </div>

      <Card className="overflow-x-auto p-0 md:p-0">
        {rows.length === 0 ? (
          <p className="m-0 p-6 text-muted-foreground">{t('empty')}</p>
        ) : (
          <table className="w-full min-w-[880px] border-collapse text-left text-sm">
            <caption className="sr-only">{t('tableCaption')}</caption>
            <thead>
              <tr className="border-b border-border">
                {[
                  t('runner'),
                  t('distance'),
                  t('size'),
                  t('shirtName'),
                  t('payment'),
                  t('kit'),
                  t('bib'),
                  t('actions'),
                ].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="px-4 py-3 font-semibold text-muted-foreground"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-b-0">
                  <th scope="row" className="px-4 py-3 font-bold">
                    <span className="block break-words">{row.runnerName}</span>
                    <span className="block font-normal break-all text-muted-foreground">
                      {row.email}
                    </span>
                  </th>
                  <td className="px-4 py-3 font-heading text-xl">{row.distance}</td>
                  <td className="px-4 py-3">{row.shirtSize}</td>
                  <td className="px-4 py-3 font-heading text-lg break-words">{row.shirtName}</td>
                  <td className="px-4 py-3">
                    <StatusPill tone={PAYMENT_TONES[row.paymentState]}>
                      {t(`state.${row.paymentState}`)}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill tone={row.kitDelivered ? 'solid' : 'outline'}>
                      {row.kitDelivered ? t('kitState.delivered') : t('kitState.waiting')}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-3 font-semibold">{row.bibNumber}</td>
                  <td className="px-4 py-3">
                    {row.reviewPaymentId ? (
                      <Link
                        href={{
                          pathname: '/admin/payments/[id]',
                          params: { id: row.reviewPaymentId },
                        }}
                        aria-label={t('review', { name: row.runnerName })}
                        className="inline-flex min-h-11 items-center font-semibold text-primary-text underline underline-offset-2"
                      >
                        {t('reviewShort')}
                      </Link>
                    ) : (
                      <Link
                        href={{ pathname: '/admin/registrations/[id]', params: { id: row.id } }}
                        aria-label={t('edit', { name: row.runnerName })}
                        className="inline-flex min-h-11 items-center font-semibold text-foreground underline underline-offset-2"
                      >
                        {t('editShort')}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <p className="m-0 text-sm text-muted-foreground">
        {t('showing', { shown: rows.length, total: totalRows })}
      </p>
    </div>
  );
}
