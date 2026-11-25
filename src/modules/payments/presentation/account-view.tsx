import Image from 'next/image';
import { useFormatter, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Link } from '@/i18n/navigation';
import { DATE_AND_TIME_FORMAT } from '@/i18n/start-time';
import { RemoveRunnerButton } from '@/modules/registration';
import { buttonClasses } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import type { FormAction, FormState } from '@/shared/ui/form-state';
import { firstName } from '@/shared/domain/person-name';
import { Card, Eyebrow } from '@/shared/ui/page-shell';
import { SignOutForm } from '@/shared/ui/sign-out-form';
import { DistancePill, StatusPill } from '@/shared/ui/status-pill';

import type { RunnerStage } from '../application/use-cases/account-overview';
import { AccountDetailsEditor, SettingForm, ShirtNameEditor } from './account-forms';
import { ReceiptSubmission } from './receipt-submission';
import { ReplaceReceiptForm } from './replace-receipt-form';

const DISTANCES = ['3K', '5K'];

const STAGE_TONES = {
  confirmed: 'solid',
  pending_payment: 'gold',
  payment_in_review: 'outline',
  receipt_rejected: 'alert',
} as const;

const DETAIL_ICONS = {
  date: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  start: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  venue: (
    <>
      <path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  kit: (
    <>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="19" r="2.5" />
      <circle cx="18" cy="5" r="2.5" />
      <path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5" />
    </>
  ),
} as const;

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: keyof typeof DETAIL_ICONS;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-16 border-t border-border py-3 pl-13">
      <dt className="text-sm text-muted-foreground">
        <span className="absolute top-3 left-0 inline-flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {DETAIL_ICONS[icon]}
          </svg>
        </span>
        {label}
      </dt>
      <dd className="m-0 font-bold break-words">{children}</dd>
    </div>
  );
}

/** One runner on the account page. */
export interface AccountRunner {
  /** The registration's UUID. */
  id: string;
  /** The runner's full name. */
  runnerName: string;
  /** The race distance. */
  distance: string;
  /** The bib number. */
  bibNumber: string;
  /** The name on the shirt. */
  shirtName: string;
  /** The shirt size. */
  shirtSize: string;
  /** The formatted fee this registration owes. */
  fee: string;
  /** Which panel to show. */
  stage: RunnerStage;
  /** The admin's reason, when the receipt was rejected. */
  rejectionReason: string | null;
  /** The ticket, once confirmed. */
  ticket: { pdfUrl: string; qrDataUrl: string } | null;
  /** The receipt under review. */
  receipt: { paymentId: string; url: string; uploadedAt: Date } | null;
}

/** Props of {@link AccountView}. */
export interface AccountViewProps {
  /** The account holder. */
  holder: { name: string; email: string; phone: string | null };
  /** How the account signs in. */
  signInMethod: 'google' | 'password';
  /** Saves the holder's name and phone. */
  saveAccount: FormAction;
  /** The administrator's WhatsApp link, when configured. */
  whatsappUrl?: string | null;
  /** Ends the session, offered here on narrow screens. */
  signOut?: () => Promise<void>;
  /** The account's runners. */
  runners: readonly AccountRunner[];
  /** The selected runner's UUID. */
  selectedId: string;
  /** The shirt sizes on offer. */
  shirtSizes: readonly string[];
  /** The last moment to change the size, when set. */
  sizeDeadline: Date | null;
  /** Whether the size can no longer be changed. */
  sizeLocked: boolean;
  /** The formatted event facts for the selected runner. */
  facts: {
    date: string | null;
    venue: string | null;
    kitPickup: string | null;
    routeMapUrl: string | null;
    start: string | null;
  };
  /** Which store receives receipts. */
  uploadMode: 'blob' | 'local';
  /** The signed-in user. */
  userId: string;
  /** Whether payment is open. */
  paymentOpen: boolean;
  /** Saves the shirt name. */
  saveShirtName: FormAction;
  /** Saves the distance. */
  saveDistance: FormAction;
  /** Saves the shirt size. */
  saveShirtSize: FormAction;
  /** Records a new receipt. */
  recordReceipt: (input: { pathname: string }) => Promise<FormState>;
  /** Replaces a receipt under review. */
  replaceReceipt: (input: { pathname: string; paymentId: string }) => Promise<FormState>;
  /** Removes an unpaid runner added by mistake, from the submitted `registrationId`. */
  removeRunner: FormAction;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-24 rounded-2xl border border-border bg-surface px-4 py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="m-0 font-heading text-2xl break-words">{value}</dd>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
      <dd className="m-0 font-bold break-words">{value}</dd>
    </div>
  );
}

function RunnerPicker({ runners, selectedId }: Pick<AccountViewProps, 'runners' | 'selectedId'>) {
  const t = useTranslations('account');

  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 font-display text-2xl font-bold uppercase">{t('runnersHeading')}</h2>
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {runners.map((runner) => {
          const active = runner.id === selectedId;
          return (
            <li key={runner.id}>
              <Link
                href={{ pathname: '/account', query: { runner: runner.id } }}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'flex h-full min-h-20 items-center gap-3 rounded-2xl border-2 p-4 no-underline',
                  active
                    ? 'border-inverse bg-inverse text-inverse-foreground'
                    : 'border-border bg-surface text-foreground',
                )}
              >
                <DistancePill distance={runner.distance} />
                <span className="flex min-w-0 flex-col">
                  <span className="font-bold break-words">{runner.runnerName}</span>
                  <span className="text-sm">
                    {t('pickerLine', {
                      status: t(`pickerStatus.${runner.stage}`),
                      bib: runner.bibNumber,
                    })}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href="/account/runners/new"
            className="flex h-full min-h-20 items-center gap-3 rounded-2xl border-2 border-dashed border-input-border p-4 text-foreground no-underline"
          >
            <span
              aria-hidden="true"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-inverse text-2xl text-inverse-foreground"
            >
              +
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="font-bold">{t('addRunner')}</span>
              <span className="text-sm text-muted-foreground">{t('addRunnerBody')}</span>
            </span>
          </Link>
        </li>
      </ul>
    </section>
  );
}

function TicketPanel({
  runner,
  facts,
}: {
  runner: AccountRunner;
  facts: AccountViewProps['facts'];
}) {
  const t = useTranslations('ticket');
  const pending = t('pending');
  if (!runner.ticket) return null;

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h3 className="m-0 font-heading text-3xl">{t('heading')}</h3>
        <p className="m-0 text-muted-foreground">{t('body')}</p>
      </div>
      <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)]">
        <div className="grid overflow-hidden rounded-2xl bg-ink text-primary-foreground sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex min-w-0 flex-col gap-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="m-0 font-heading text-xl">
                {t('brand')} <span className="text-on-ink-accent">{t('brandYear')}</span>
              </p>
              <DistancePill distance={runner.distance} />
            </div>
            <div>
              <p className="m-0 text-xs font-bold tracking-widest text-gold uppercase">
                {t('runner')}
              </p>
              <p className="m-0 font-display text-2xl font-bold break-words">{runner.runnerName}</p>
            </div>
            <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <TicketFact label={t('date')} value={facts.date ?? pending} />
              <TicketFact label={t('start')} value={facts.start ?? pending} />
              <TicketFact label={t('venue')} value={facts.venue ?? pending} />
              <TicketFact label={t('bib')} value={runner.bibNumber} />
              <TicketFact label={t('size')} value={runner.shirtSize} />
              <TicketFact label={t('shirt')} value={runner.shirtName} />
            </dl>
          </div>
          <div className="flex items-center gap-4 border-t-2 border-dashed border-white/40 p-5 sm:flex-col sm:justify-center sm:border-t-0 sm:border-l-2">
            <Image
              src={runner.ticket.qrDataUrl}
              alt={t('qrAlt')}
              width={130}
              height={130}
              unoptimized
              className="ph-no-capture rounded-lg bg-white p-1"
            />
            <div>
              <p className="m-0 text-xs font-bold tracking-widest text-gold uppercase">
                {t('bibLabel')}
              </p>
              <p className="m-0 text-xl font-bold">{runner.bibNumber}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <a
            href={runner.ticket.pdfUrl}
            className={buttonClasses({ variant: 'inverse', fullWidth: true })}
          >
            {t('download')}
          </a>
          <p className="m-0 text-sm text-muted-foreground">{t('help')}</p>
        </div>
      </div>
    </Card>
  );
}

function TicketFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold tracking-widest text-gold uppercase">{label}</dt>
      <dd className="m-0 font-bold break-words">{value}</dd>
    </div>
  );
}

function PaymentPanel({
  runner,
  paymentOpen,
  uploadMode,
  userId,
  recordReceipt,
  replaceReceipt,
  whatsappUrl,
}: { runner: AccountRunner } & Pick<
  AccountViewProps,
  'paymentOpen' | 'uploadMode' | 'userId' | 'recordReceipt' | 'replaceReceipt' | 'whatsappUrl'
>) {
  const t = useTranslations('account');
  const paymentT = useTranslations('payment');
  const common = useTranslations('common');
  const format = useFormatter();

  const panelClasses = 'grid gap-5 lg:grid-cols-2';
  const uploadBox =
    'flex flex-col gap-3 rounded-2xl border-2 border-dashed border-input-border p-4';

  if (runner.stage === 'payment_in_review') {
    return (
      <Card className={panelClasses}>
        <div className="flex flex-col items-start gap-3">
          <h3 className="m-0 font-heading text-3xl">{t('reviewTitle')}</h3>
          <p className="m-0 text-muted-foreground">{t('reviewBody')}</p>
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonClasses({ variant: 'outline' }), 'self-start')}
            >
              {paymentT('whatsapp')}
            </a>
          )}
        </div>
        {runner.receipt && (
          <div className="flex flex-col gap-3 rounded-2xl bg-muted p-4">
            <p className="m-0 text-sm text-muted-foreground">{t('receiptSent')}</p>
            <p className="m-0 font-semibold">
              {t('sentAt', {
                date: format.dateTime(runner.receipt.uploadedAt, DATE_AND_TIME_FORMAT),
              })}
            </p>
            <a
              href={runner.receipt.url}
              className="inline-flex min-h-11 items-center self-start font-semibold underline underline-offset-2"
            >
              {t('viewReceipt')}
            </a>
            <ReplaceReceiptForm
              paymentId={runner.receipt.paymentId}
              mode={uploadMode}
              userId={userId}
              action={replaceReceipt}
            />
          </div>
        )}
      </Card>
    );
  }

  const rejected = runner.stage === 'receipt_rejected';

  return (
    <Card className={cn(panelClasses, 'border-2 border-gold')}>
      <div className="flex flex-col gap-3">
        {rejected && (
          <div className="flex flex-col gap-1 rounded-lg border-2 border-primary-text p-3">
            <h3 className="m-0 font-display text-lg font-bold text-primary-text uppercase">
              {t('rejectedTitle')}
            </h3>
            {runner.rejectionReason && (
              <p className="m-0">{t('rejectedReason', { reason: runner.rejectionReason })}</p>
            )}
            <p className="m-0 text-sm text-muted-foreground">{t('rejectedBody')}</p>
          </div>
        )}
        <h3 className="m-0 font-heading text-3xl">{t('pendingTitle')}</h3>
        <p className="m-0 text-muted-foreground">{t('pendingBody')}</p>
        <p className="m-0 flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3">
          <span>{t('pendingLine', { distance: runner.distance, name: runner.runnerName })}</span>
          <strong>{runner.fee}</strong>
        </p>
        {paymentOpen && (
          <Link
            href="/payment"
            className={cn(buttonClasses({ variant: 'cta' }), 'w-full sm:w-auto sm:self-start')}
          >
            {t('seeTransfer')}
          </Link>
        )}
      </div>
      {paymentOpen ? (
        <ReceiptSubmission
          mode={uploadMode}
          userId={userId}
          action={recordReceipt}
          submitLabel={paymentT('submit')}
          submitTone="inverse"
          next="refresh"
          className={uploadBox}
          before={
            <h4 className="m-0 font-display text-lg font-bold uppercase">{t('alreadyPaid')}</h4>
          }
          after={
            <p className="m-0 text-sm text-muted-foreground">{paymentT('receiptHelpAccount')}</p>
          }
        />
      ) : (
        <div role="status" className="rounded-xl bg-inverse px-4 py-3 text-inverse-foreground">
          <p className="m-0 font-bold">{common('openingSoonTitle')}</p>
          <p className="m-0 text-sm">{common('openingSoonBody')}</p>
        </div>
      )}
    </Card>
  );
}

/**
 * The account page: a runner picker, and everything about the selected runner.
 *
 * @remarks
 * The picker always shows, even with one runner. Everything below it belongs to
 * the selected runner, so two runners' data are never mixed in one panel.
 *
 * @param props - The account, its runners, the facts, and the actions.
 * @returns The account view.
 */
export function AccountView(props: AccountViewProps) {
  const { holder, runners, selectedId, shirtSizes, sizeDeadline, sizeLocked, facts } = props;
  const t = useTranslations('account');
  const common = useTranslations('common');
  const format = useFormatter();
  const runner = runners.find((item) => item.id === selectedId) ?? runners[0];
  const pending = common('pending');

  return (
    <div data-private className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-5xl break-words">
          {t('greeting', { name: firstName(holder.name) })}
        </h1>
        <p className="m-0 max-w-2xl text-muted-foreground">{t('body')}</p>
      </header>

      <RunnerPicker runners={runners} selectedId={runner?.id ?? selectedId} />

      {runner && (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col justify-between gap-4 border-t-2 border-inverse pt-5 lg:flex-row lg:items-start">
            <div className="flex flex-col items-start gap-2">
              <h2 data-testid="selected-runner" className="m-0 font-heading text-4xl break-words">
                {runner.runnerName}
              </h2>
              <StatusPill tone={STAGE_TONES[runner.stage]}>
                {t(`status.${runner.stage}`)}
              </StatusPill>
              {(runner.stage === 'pending_payment' || runner.stage === 'receipt_rejected') && (
                <RemoveRunnerButton
                  key={runner.id}
                  registrationId={runner.id}
                  runnerName={runner.runnerName}
                  from="account"
                  action={props.removeRunner}
                  className="-ml-1"
                />
              )}
            </div>
            <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label={t('distance')} value={runner.distance} />
              <StatCard label={t('size')} value={runner.shirtSize} />
              <StatCard label={t('bib')} value={runner.bibNumber} />
            </dl>
          </section>

          {runner.stage === 'confirmed' ? (
            <TicketPanel runner={runner} facts={facts} />
          ) : (
            <PaymentPanel
              runner={runner}
              paymentOpen={props.paymentOpen}
              uploadMode={props.uploadMode}
              userId={props.userId}
              recordReceipt={props.recordReceipt}
              replaceReceipt={props.replaceReceipt}
              whatsappUrl={props.whatsappUrl ?? null}
            />
          )}

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <Card className="flex flex-col gap-4">
              <h3 className="m-0 font-heading text-3xl">{t('shirtHeading')}</h3>
              <ShirtNameEditor
                key={runner.id}
                registrationId={runner.id}
                shirtName={runner.shirtName}
                action={props.saveShirtName}
              />
              <p className="m-0 text-sm text-muted-foreground">
                {t('changeNote')}{' '}
                {sizeDeadline &&
                  t('deadlineNote', {
                    date: format.dateTime(sizeDeadline, { dateStyle: 'long' }),
                  })}
              </p>
              <dl className="m-0">
                <div className="flex justify-between gap-3 border-t border-border py-2">
                  <dt className="text-muted-foreground">{t('size')}</dt>
                  <dd className="m-0 font-bold">{runner.shirtSize}</dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-border py-2">
                  <dt className="text-muted-foreground">{t('delivery')}</dt>
                  <dd className="m-0 font-bold">{t('withKit')}</dd>
                </div>
              </dl>
              <div className="grid gap-4 sm:grid-cols-2">
                <SettingForm
                  key={`distance-${runner.id}`}
                  registrationId={runner.id}
                  label={t('distance')}
                  name="distance"
                  options={DISTANCES}
                  value={runner.distance}
                  submitLabel={t('changeDistance')}
                  success={t('distanceSaved')}
                  action={props.saveDistance}
                />
                {!sizeLocked && shirtSizes.length > 0 && (
                  <SettingForm
                    key={`size-${runner.id}`}
                    registrationId={runner.id}
                    label={t('size')}
                    name="shirtSize"
                    options={shirtSizes}
                    value={runner.shirtSize}
                    submitLabel={t('changeSize')}
                    success={t('sizeSaved')}
                    action={props.saveShirtSize}
                  />
                )}
              </div>
            </Card>

            <Card className="flex flex-col gap-3">
              <h3 className="m-0 font-heading text-3xl">{t('detailsHeading')}</h3>
              <dl className="m-0 flex flex-col">
                <DetailRow icon="date" label={t('date')}>
                  {facts.date ?? pending}
                </DetailRow>
                <DetailRow icon="start" label={t('start', { distance: runner.distance })}>
                  {facts.start ?? pending}
                </DetailRow>
                <DetailRow icon="venue" label={t('venue')}>
                  {facts.venue ?? pending}
                </DetailRow>
                <DetailRow icon="kit" label={t('kitPickup')}>
                  {facts.kitPickup ?? pending}
                  <span className="mt-1 block text-sm font-normal text-muted-foreground">
                    {t('kitPickupNote', { bib: runner.bibNumber })}
                  </span>
                </DetailRow>
                <DetailRow icon="route" label={t('route')}>
                  {facts.routeMapUrl ? (
                    <a
                      href={facts.routeMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline underline-offset-2"
                    >
                      {t('routeLink')}
                    </a>
                  ) : (
                    pending
                  )}
                </DetailRow>
              </dl>
            </Card>
          </div>

          <Card className="flex flex-col gap-3">
            <AccountDetailsEditor
              name={holder.name}
              phone={holder.phone}
              action={props.saveAccount}
              title={t('yourData')}
            >
              <dl className="m-0 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Fact label={t('name')} value={holder.name} />
                <Fact label={t('email')} value={holder.email} />
                <Fact label={t('phone')} value={holder.phone ?? pending} />
                <Fact
                  label={t('access')}
                  value={props.signInMethod === 'google' ? t('googleAccess') : t('passwordAccess')}
                />
              </dl>
            </AccountDetailsEditor>
            {props.signOut && <SignOutForm action={props.signOut} className="sm:hidden" />}
          </Card>
        </div>
      )}
    </div>
  );
}
