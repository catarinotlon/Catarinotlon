import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { formatMoney } from '@/i18n/money';
import { Link } from '@/i18n/navigation';
import { buttonClasses } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import { CopyButton } from '@/shared/ui/copy-button';
import type { FormState } from '@/shared/ui/form-state';
import { Card } from '@/shared/ui/page-shell';
import { RegistrationSteps } from '@/shared/ui/registration-steps';

import { ReceiptUploadForm } from './receipt-upload-form';
import { whatsappUrl } from './whatsapp-url';

/** One runner on the payment page. */
export interface PaymentRunner {
  /** The registration's UUID. */
  id: string;
  /** The runner's full name. */
  runnerName: string;
  /** The race distance. */
  distance: string;
  /** The name on the shirt. */
  shirtName: string;
  /** The shirt size. */
  shirtSize: string;
  /** The fee stored on the registration, in cents. */
  feeCents: number;
}

/** Props of {@link PaymentView}. */
export interface PaymentViewProps {
  /** The signed-in user. */
  userId: string;
  /** Which store receives the receipt. */
  uploadMode: 'blob' | 'local';
  /** Records the uploaded receipt. */
  recordReceipt: (input: { pathname: string }) => Promise<FormState>;
  /** The bank data. */
  bank: { beneficiary: string; bank: string; clabe: string };
  /** The administrator's contact card, in the page's locale. */
  contact: {
    fullName: string;
    phone: string;
    email: string;
    whatsapp: string;
    hours: string;
  } | null;
  /** The generated transfer concept. */
  concept: string;
  /** The amount to transfer, in cents. */
  totalCents: number;
  /** The unpaid runners. */
  runners: readonly PaymentRunner[];
  /** The page's title and opening paragraph. */
  intro?: ReactNode;
}

function Row({
  label,
  value,
  action,
  large = false,
}: {
  label: string;
  value: ReactNode;
  action?: ReactNode;
  large?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <dl className="m-0 flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">{label}</dt>
        <dd
          className={cn(
            'm-0 ml-auto text-right break-all',
            large ? 'font-display text-2xl font-bold' : 'font-bold',
          )}
        >
          {value}
        </dd>
      </dl>
      {action && <span className="self-end sm:self-auto">{action}</span>}
    </div>
  );
}

/**
 * The transfer data, the runners to pay, the receipt upload, and the contact card.
 *
 * @remarks
 * Only rendered for a signed-in runner while payment is open. On narrow screens
 * the runners to pay come before the bank data.
 *
 * @param props - The payment data.
 * @returns The payment view.
 */
export function PaymentView({
  userId,
  uploadMode,
  recordReceipt,
  bank,
  contact,
  concept,
  totalCents,
  runners,
  intro,
}: PaymentViewProps) {
  const t = useTranslations('payment');
  const locale = useLocale();
  const total = formatMoney(totalCents, locale);

  return (
    <div
      data-private
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:grid-rows-[auto_1fr]"
    >
      <div className="order-2 lg:col-start-1 lg:row-span-2 lg:row-start-1">
        <Card className="flex flex-col gap-5">
          <RegistrationSteps current="payment" />
          {intro}
          <h2 className="m-0 font-display text-2xl font-bold uppercase">{t('transferHeading')}</h2>
          <div className="rounded-2xl bg-muted px-4 py-1">
            <Row
              label={t('beneficiary')}
              value={bank.beneficiary}
              action={
                <CopyButton
                  value={bank.beneficiary}
                  label={t('copyBeneficiary')}
                  copiedLabel={t('copiedBeneficiary')}
                />
              }
            />
            <Row label={t('bank')} value={bank.bank} />
            <Row
              label={t('clabe')}
              value={bank.clabe}
              large
              action={
                <CopyButton
                  value={bank.clabe}
                  label={t('copyClabe')}
                  copiedLabel={t('copiedClabe')}
                />
              }
            />
            <Row label={t('exactAmount')} value={total} />
            <Row
              label={t('concept')}
              value={concept}
              action={
                <CopyButton
                  value={concept}
                  label={t('copyConcept')}
                  copiedLabel={t('copiedConcept')}
                />
              }
            />
          </div>
          <h2 className="m-0 font-display text-2xl font-bold uppercase">{t('uploadHeading')}</h2>
          <ReceiptUploadForm
            mode={uploadMode}
            userId={userId}
            action={recordReceipt}
            submitLabel={t('submit')}
            dashed
          />
          <Link
            href="/account"
            className="inline-flex min-h-11 items-center justify-center font-semibold underline underline-offset-2"
          >
            {t('later')}
          </Link>
        </Card>
      </div>

      <div data-order="first-on-mobile" className="order-1 lg:col-start-2 lg:row-start-1">
        <Card className="flex flex-col gap-3">
          <h2 className="m-0 font-heading text-2xl">{t('summaryHeading')}</h2>
          <p className="m-0 text-sm text-muted-foreground">{t('summaryBody')}</p>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {runners.map((runner) => (
              <li
                key={runner.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-surface-raised p-3"
              >
                <span className="min-w-0">
                  <span className="block font-bold break-words">
                    {runner.distance} · {runner.runnerName}
                  </span>
                  <span className="block text-sm break-words text-muted-foreground">
                    {t('shirtLine', { name: runner.shirtName, size: runner.shirtSize })}
                  </span>
                </span>
                <span className="shrink-0 font-semibold">
                  {formatMoney(runner.feeCents, locale)}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <span className="font-semibold">{t('total', { count: runners.length })}</span>
            <span data-testid="payment-total" className="font-heading text-2xl">
              {total}
            </span>
          </div>
          <Link
            href="/account/runners/new"
            className={cn(
              buttonClasses({ variant: 'outline', fullWidth: true }),
              'rounded-full border-dashed',
            )}
          >
            {t('addRunner')}
          </Link>
          <Link
            href="/account"
            className="inline-flex min-h-11 items-center justify-center font-semibold underline underline-offset-2"
          >
            {t('editDetails')}
          </Link>
        </Card>
      </div>

      <div className="order-3 lg:col-start-2 lg:row-start-2">
        {contact && (
          <Card className="flex flex-col gap-2">
            <h2 className="m-0 font-heading text-2xl">{t('contactHeading')}</h2>
            <p className="m-0 text-sm text-muted-foreground">{t('contactBody')}</p>
            <div>
              <Row label={t('contactName')} value={contact.fullName} />
              <Row label={t('contactPhone')} value={contact.phone} />
              <Row label={t('contactEmail')} value={contact.email} />
              <Row label={t('contactHours')} value={contact.hours} />
            </div>
            <a
              href={whatsappUrl(contact.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({ variant: 'inverse', fullWidth: true })}
            >
              {t('whatsapp')}
            </a>
          </Card>
        )}
      </div>
    </div>
  );
}
