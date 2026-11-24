'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Button } from '@/shared/ui/button';
import { FormAlert, TextField } from '@/shared/ui/form-fields';
import type { FormAction } from '@/shared/ui/form-state';
import { Card } from '@/shared/ui/page-shell';
import { DistancePill, StatusPill } from '@/shared/ui/status-pill';
import { useStickyForm } from '@/shared/ui/use-sticky-form';

import type { AdminPaymentState } from '../application/use-cases/admin-overview';

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
}

const PAYMENT_TONES = { paid: 'solid', in_review: 'gold', pending: 'outline' } as const;

/** Props of {@link KitPickupPanel}. */
export interface KitPickupPanelProps {
  /** The runner. */
  runner: KitRunner;
  /** Whether the runner was found by scanning their ticket. */
  scanned?: boolean;
  /** Marks the kit as delivered. */
  deliverAction: FormAction;
  /** Undoes the delivery. */
  undoAction: FormAction;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="m-0 text-right font-bold break-words">{children}</dd>
    </div>
  );
}

/**
 * One runner's kit: what to hand over, and the delivery action.
 *
 * @remarks
 * Anyone can collect a kit with the ticket, so only an optional name is recorded.
 *
 * @param props - The runner and the actions.
 * @returns The panel.
 */
export function KitPickupPanel({
  runner,
  scanned = false,
  deliverAction,
  undoAction,
}: KitPickupPanelProps) {
  const t = useTranslations('admin.kits');
  const list = useTranslations('admin.list');
  const root = useTranslations();
  const deliver = useStickyForm(deliverAction);
  const undo = useStickyForm(undoAction);
  const formError = deliver.state.formError ?? undo.state.formError;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {scanned && <p className="m-0 text-sm text-muted-foreground">{t('ticketRead')}</p>}
          <h2 className="m-0 font-display text-3xl font-bold break-words">{runner.runnerName}</h2>
        </div>
        <DistancePill distance={runner.distance} />
      </div>
      <dl className="m-0 flex flex-col">
        <Fact label={t('size')}>{runner.shirtSize}</Fact>
        <Fact label={t('shirtName')}>
          <span className="font-heading text-xl">{runner.shirtName}</span>
        </Fact>
        <Fact label={t('payment')}>
          <StatusPill tone={PAYMENT_TONES[runner.paymentState]}>
            {list(`state.${runner.paymentState}`)}
          </StatusPill>
        </Fact>
        <Fact label={t('bib')}>{runner.bibNumber}</Fact>
      </dl>

      {formError && <FormAlert>{root(formError as never)}</FormAlert>}

      {runner.kitDelivered ? (
        <form action={undo.formAction} onSubmit={undo.onSubmit} className="flex flex-col gap-3">
          <input type="hidden" name="registrationId" value={runner.id} />
          <p
            role="status"
            className="m-0 rounded-lg bg-inverse p-3 font-bold text-inverse-foreground"
          >
            {t('delivered')}
          </p>
          {runner.collectedBy && (
            <p className="m-0">{t('collectedLine', { name: runner.collectedBy })}</p>
          )}
          <Button type="submit" variant="outline" fullWidth disabled={undo.pending}>
            {t('undo')}
          </Button>
        </form>
      ) : runner.paymentState === 'paid' ? (
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
          <Button type="submit" variant="cta" fullWidth disabled={deliver.pending}>
            {t('deliver')}
          </Button>
        </form>
      ) : (
        <p className="m-0 font-semibold text-primary-text">{t('notConfirmed')}</p>
      )}
    </Card>
  );
}
