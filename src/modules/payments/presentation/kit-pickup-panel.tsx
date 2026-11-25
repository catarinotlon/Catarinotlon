'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useRef, type ReactNode } from 'react';

import { DATE_AND_TIME_FORMAT } from '@/i18n/start-time';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import { FormAlert, TextField } from '@/shared/ui/form-fields';
import type { FormAction } from '@/shared/ui/form-state';
import { DistancePill } from '@/shared/ui/status-pill';
import { useStickyForm } from '@/shared/ui/use-sticky-form';

import type { AdminPaymentState } from '../application/use-cases/admin-overview';
import { kitVerdict, type KitVerdict } from './kit-scan';

/** A runner on the kit pickup screen. */
export interface KitRunner {
  /** The registration's UUID. */
  id: string;
  /** The runner's full name. */
  runnerName: string;
  /** The race distance. */
  distance: string;
  /** The shirt size. */
  shirtSize: string;
  /** The name on the shirt. */
  shirtName: string;
  /** The bib number. */
  bibNumber: string;
  /** The payment state. */
  paymentState: AdminPaymentState;
  /** Whether the kit has been delivered. */
  kitDelivered: boolean;
  /** Who collected the kit, when noted. */
  collectedBy: string | null;
  /** When the kit was delivered, or `null` while it is pending. */
  deliveredAt: Date | null;
}

/** Props of {@link KitPickupPanel}. */
export interface KitPickupPanelProps {
  /** The runner. */
  runner: KitRunner;
  /** Marks the kit as delivered. */
  deliverAction: FormAction;
  /** Undoes the delivery. */
  undoAction: FormAction;
  /** Called once the server has recorded the delivery. */
  onDelivered?: (runner: KitRunner) => void;
  /** Moves on to the next ticket; shown when the runner was found by scanning. */
  onNext?: () => void;
}

const BAND_TONES: Record<KitVerdict, string> = {
  ready: 'bg-success text-success-foreground',
  delivered: 'bg-gold text-ink',
  unpaid: 'bg-primary text-primary-foreground',
};

/**
 * The colored band that says what to do, shared by every kit result.
 *
 * @param props - The band's colors, icon, and heading.
 * @returns The band.
 */
export function KitVerdictBand({
  tone,
  icon,
  children,
  headingRef,
}: {
  /** Tailwind classes for the band's background and text. */
  tone: string;
  /** The icon before the heading. */
  icon: ReactNode;
  /** The heading text. */
  children: ReactNode;
  /** Lets the caller move focus to the heading. */
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-5 py-3 transition-colors duration-150 motion-reduce:transition-none',
        tone,
      )}
    >
      {icon}
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="m-0 font-heading text-3xl leading-none outline-none"
      >
        {children}
      </h2>
    </div>
  );
}

/** Icons of the verdict band. */
export const VerdictIcon = {
  /** A check mark, for a kit to deliver or just delivered. */
  check: (
    <svg
      aria-hidden="true"
      className="size-7 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  ),
  /** A warning sign, for a kit that was already delivered. */
  warn: (
    <svg
      aria-hidden="true"
      className="size-7 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v5M12 18v.01" />
    </svg>
  ),
  /** A no-entry sign, for a kit that must not be delivered. */
  stop: (
    <svg
      aria-hidden="true"
      className="size-7 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M6 18L18 6" />
    </svg>
  ),
} as const;

const ICONS: Record<KitVerdict, ReactNode> = {
  ready: VerdictIcon.check,
  delivered: VerdictIcon.warn,
  unpaid: VerdictIcon.stop,
};

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="m-0 text-right font-bold break-words">{children}</dd>
    </div>
  );
}

/**
 * One runner's kit: a band that says what to do, what to hand over, and the action.
 *
 * @remarks
 * A kit is only delivered for a confirmed (paid) registration, and only once.
 * Anyone can collect it with the ticket, so only an optional name is recorded.
 * When the runner came from a scan, `onNext` adds the way back to the camera.
 *
 * @param props - The runner, the actions, and the scan callbacks.
 * @returns The panel.
 */
export function KitPickupPanel({
  runner,
  deliverAction,
  undoAction,
  onDelivered,
  onNext,
}: KitPickupPanelProps) {
  const t = useTranslations('admin.kits');
  const busy = useTranslations('busy');
  const root = useTranslations();
  const format = useFormatter();
  const deliver = useStickyForm(deliverAction);
  const undo = useStickyForm(undoAction);
  const formError = deliver.state.formError ?? undo.state.formError;
  const verdict = kitVerdict(runner);
  const heading = useRef<HTMLHeadingElement>(null);

  const reported = useRef<typeof deliver.state | null>(null);
  useEffect(() => {
    if (deliver.state.done && reported.current !== deliver.state) {
      reported.current = deliver.state;
      onDelivered?.(runner);
    }
  }, [deliver.state, onDelivered, runner]);

  useEffect(() => {
    if (onNext) heading.current?.focus({ preventScroll: true });
  }, [onNext, verdict]);

  return (
    <article className="flex flex-col overflow-hidden rounded-3xl border border-border bg-surface">
      <KitVerdictBand tone={BAND_TONES[verdict]} icon={ICONS[verdict]} headingRef={heading}>
        {t(`verdict.${verdict}`)}
      </KitVerdictBand>

      <div className="flex flex-col gap-4 p-5">
        <div data-private className="flex flex-col gap-1">
          <div className="flex items-start justify-between gap-3">
            <p className="m-0 font-display text-3xl font-bold break-words">{runner.runnerName}</p>
            <DistancePill distance={runner.distance} />
          </div>
          <dl className="m-0 flex flex-col">
            <Fact label={t('bib')}>
              <span className="text-xl">{runner.bibNumber}</span>
            </Fact>
            <Fact label={t('size')}>{runner.shirtSize}</Fact>
            <Fact label={t('shirtName')}>
              <span className="font-heading text-xl">{runner.shirtName}</span>
            </Fact>
          </dl>
        </div>

        {formError && <FormAlert>{root(formError as never)}</FormAlert>}

        {verdict === 'ready' && (
          <form
            action={deliver.formAction}
            onSubmit={deliver.onSubmit}
            className="flex flex-col gap-3"
          >
            <input type="hidden" name="registrationId" value={runner.id} />
            <TextField
              label={t('collectedBy')}
              name="collectedBy"
              help={t('collectedHelp')}
              autoComplete="off"
            />
            <Button
              type="submit"
              variant="cta"
              fullWidth
              pending={deliver.pending}
              pendingLabel={busy('recordingDelivery')}
            >
              {t('deliver')}
            </Button>
            {onNext && (
              <Button type="button" variant="outline" fullWidth onClick={onNext}>
                {t('cancelScan')}
              </Button>
            )}
          </form>
        )}

        {verdict === 'delivered' && (
          <form action={undo.formAction} onSubmit={undo.onSubmit} className="flex flex-col gap-3">
            <input type="hidden" name="registrationId" value={runner.id} />
            <div data-private className="flex flex-col gap-1 rounded-xl bg-muted p-3">
              {runner.deliveredAt && (
                <p className="m-0">
                  {t('deliveredAt', {
                    when: format.dateTime(runner.deliveredAt, DATE_AND_TIME_FORMAT),
                  })}
                </p>
              )}
              {runner.collectedBy && (
                <p className="m-0">{t('collectedLine', { name: runner.collectedBy })}</p>
              )}
            </div>
            {onNext && (
              <Button type="button" variant="inverse" fullWidth onClick={onNext}>
                {t('scanNext')}
              </Button>
            )}
            <Button
              type="submit"
              variant="outline"
              fullWidth
              pending={undo.pending}
              pendingLabel={busy('undoing')}
            >
              {t('undoDelivery')}
            </Button>
          </form>
        )}

        {verdict === 'unpaid' && (
          <>
            <p className="m-0 rounded-xl bg-muted p-3">
              {t('unpaidBody', { state: runner.paymentState })}
            </p>
            {onNext && (
              <Button type="button" variant="inverse" fullWidth onClick={onNext}>
                {t('scanNext')}
              </Button>
            )}
          </>
        )}
      </div>
    </article>
  );
}
