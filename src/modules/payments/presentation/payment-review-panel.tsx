'use client';

import Image from 'next/image';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useId } from 'react';

import { formatMoney } from '@/i18n/money';
import { Button } from '@/shared/ui/button';
import { FormAlert } from '@/shared/ui/form-fields';
import type { FormAction } from '@/shared/ui/form-state';
import { Card } from '@/shared/ui/page-shell';
import { DistancePill } from '@/shared/ui/status-pill';
import { useStickyForm } from '@/shared/ui/use-sticky-form';

/** What the admin compares before deciding on a payment. */
export interface PaymentReviewData {
  /** The payment's UUID. */
  paymentId: string;
  /** The review state. */
  status: 'in_review' | 'confirmed' | 'rejected';
  /** The protected route that streams the receipt. */
  receiptUrl: string;
  /** Whether the receipt can be shown inline as an image. */
  receiptIsImage: boolean;
  /** When the receipt was uploaded. */
  uploadedAt: Date;
  /** The account holder's name. */
  holderName: string;
  /** The account holder's email. */
  holderEmail: string;
  /** The account holder's phone, when known. */
  holderPhone?: string | null;
  /** The runners this payment covers. */
  runners: readonly { id: string; name: string; distance: string; bib: string }[];
  /** The expected amount, in cents. */
  amountCents: number;
  /** The destination CLABE, when configured. */
  clabe: string | null;
  /** The expected concept. */
  concept: string;
  /** The rejection reason, when rejected. */
  rejectionReason: string | null;
  /** When the payment was reviewed. */
  reviewedAt: Date | null;
}

/** Props of {@link PaymentReviewPanel}. */
export interface PaymentReviewPanelProps {
  /** The payment under review. */
  data: PaymentReviewData;
  /** Confirms the payment. */
  confirmAction: FormAction;
  /** Rejects the payment. */
  rejectAction: FormAction;
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="m-0 text-right font-bold break-words">{children}</dd>
    </div>
  );
}

/**
 * Shows the receipt next to what it should say, and records the decision.
 *
 * @param props - The payment and the two actions.
 * @returns The panel.
 */
export function PaymentReviewPanel({ data, confirmAction, rejectAction }: PaymentReviewPanelProps) {
  const t = useTranslations('admin.review');
  const root = useTranslations();
  const locale = useLocale();
  const format = useFormatter();
  const reasonId = useId();
  const confirm = useStickyForm(confirmAction);
  const reject = useStickyForm(rejectAction);
  const reasonError = reject.state.fieldErrors?.reason;
  const formError = confirm.state.formError ?? reject.state.formError;
  const onlyRunner = data.runners.length === 1 ? data.runners[0] : undefined;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card className="flex flex-col gap-3">
        <h2 className="m-0 font-heading text-2xl">{t('receipt')}</h2>
        {data.receiptIsImage ? (
          <Image
            src={data.receiptUrl}
            alt={t('receiptFrame')}
            width={640}
            height={860}
            unoptimized
            className="h-auto w-full rounded-lg border border-border"
          />
        ) : (
          <div className="flex min-h-96 items-center justify-center rounded-xl border-2 border-dashed border-input-border p-6 text-center">
            <p className="m-0 max-w-xs text-muted-foreground">{t('pdfPreview')}</p>
          </div>
        )}
        <p className="m-0 text-sm text-muted-foreground">
          {t('sentAt', {
            date: format.dateTime(data.uploadedAt, { dateStyle: 'medium', timeStyle: 'short' }),
          })}
        </p>
        <a
          href={data.receiptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center self-end font-semibold underline underline-offset-2"
        >
          {t('open')}
        </a>
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="m-0 font-display text-3xl font-bold break-words">{data.holderName}</h2>
            <p className="m-0 text-sm break-all text-muted-foreground">
              {[data.holderEmail, data.holderPhone].filter(Boolean).join(' · ')}
            </p>
          </div>
          {onlyRunner && <DistancePill distance={onlyRunner.distance} />}
        </div>
        <dl className="m-0 flex flex-col">
          <Detail label={t('covers')}>
            <ul className="m-0 list-none p-0">
              {data.runners.map((runner, index) => (
                <li key={runner.id}>
                  {index === 0 && `${data.runners.length} · `}
                  <span>
                    {t('coverLine', {
                      name: runner.name,
                      distance: runner.distance,
                      bib: runner.bib,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </Detail>
          <Detail label={t('expected')}>{formatMoney(data.amountCents, locale)}</Detail>
          <Detail label={t('clabe')}>{data.clabe ?? '—'}</Detail>
          <Detail label={t('concept')}>{data.concept}</Detail>
        </dl>

        {data.status === 'in_review' ? (
          <>
            <p className="m-0 rounded-lg bg-muted p-3 text-sm text-foreground">{t('hint')}</p>
            {formError && <FormAlert>{root(formError as never)}</FormAlert>}
            <form action={confirm.formAction} onSubmit={confirm.onSubmit}>
              <input type="hidden" name="paymentId" value={data.paymentId} />
              <Button
                type="submit"
                variant="cta"
                fullWidth
                disabled={confirm.pending || reject.pending}
              >
                {t('confirm')}
              </Button>
            </form>
            <form
              action={reject.formAction}
              onSubmit={reject.onSubmit}
              className="flex flex-col gap-2"
              noValidate
            >
              <input type="hidden" name="paymentId" value={data.paymentId} />
              <label htmlFor={reasonId} className="font-semibold">
                {t('reason')}
              </label>
              <textarea
                id={reasonId}
                name="reason"
                rows={3}
                aria-invalid={reasonError ? true : undefined}
                aria-describedby={reasonError ? `${reasonId}-error` : undefined}
                className="w-full rounded-lg border-2 border-input-border bg-input p-3 text-foreground"
              />
              {reasonError && (
                <p id={`${reasonId}-error`} className="m-0 text-sm font-semibold text-primary-text">
                  {root(reasonError as never)}
                </p>
              )}
              <Button
                type="submit"
                variant="outline"
                fullWidth
                className="rounded-full"
                disabled={confirm.pending || reject.pending}
              >
                {t('reject')}
              </Button>
            </form>
          </>
        ) : (
          <div role="status" className="flex flex-col gap-1 rounded-lg bg-surface-raised p-4">
            <p className="m-0 font-bold">
              {data.status === 'confirmed' ? t('confirmed') : t('rejected')}
            </p>
            {data.rejectionReason && (
              <p className="m-0">{t('rejectedReason', { reason: data.rejectionReason })}</p>
            )}
            {data.reviewedAt && (
              <p className="m-0 text-sm text-muted-foreground">
                {t('reviewedBy', {
                  date: format.dateTime(data.reviewedAt, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }),
                })}
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
