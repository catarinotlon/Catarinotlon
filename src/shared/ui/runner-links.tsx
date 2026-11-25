'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { cn } from './cn';
import { initials } from './initials';
import { StatusPill } from './status-pill';

/** Where a runner's registration stands, as the menus label it. */
export type MenuRunnerStage =
  'pending_payment' | 'payment_in_review' | 'confirmed' | 'receipt_rejected';

/** A runner of the signed-in account, as the menus list it. */
export interface MenuRunner {
  /** The registration's ID. */
  id: string;
  /** The runner's full name. */
  name: string;
  /** The race distance. */
  distance: string;
  /** The runner's bib number. */
  bibNumber: string;
  /** Where the registration stands. */
  stage: MenuRunnerStage;
}

/** The signed-in account, as the menus show it. */
export interface MenuAccount {
  /** The account holder's name. */
  name: string;
  /** The account's runners. */
  runners: readonly MenuRunner[];
  /** How many runners can be paid for now; 0 hides the payment link. */
  payableCount: number;
}

/** Props of {@link RunnerLinks}. */
export interface RunnerLinksProps {
  /** The runners to list. */
  runners: readonly MenuRunner[];
  /** `drawer`: roomy rows with initials, for the phone menu. `menu`: compact rows, for the account menu. */
  layout: 'drawer' | 'menu';
  /** Called when a runner is chosen, so the menu around the list can close. */
  onNavigate?: () => void;
}

const STAGE_TONES = {
  confirmed: 'solid',
  pending_payment: 'gold',
  payment_in_review: 'outline',
  receipt_rejected: 'alert',
} as const;

/**
 * The account's runners under a "Your runners" label, each linking to the account page with
 * that runner chosen.
 *
 * @remarks
 * Each row shows the name, the distance, the bib number, and the registration's state.
 * Names are personal data, so every row carries `data-private`.
 *
 * @param props - The runners, the look, and what to do once one is chosen.
 * @returns The labeled list.
 */
export function RunnerLinks({ runners, layout, onNavigate }: RunnerLinksProps) {
  const t = useTranslations('nav');
  const status = useTranslations('account');
  const drawer = layout === 'drawer';

  return (
    <div>
      <p
        className={cn(
          'm-0 text-xs font-bold tracking-widest text-muted-foreground uppercase',
          drawer ? 'mb-1' : 'px-2.5 pt-2.5 pb-1.5',
        )}
      >
        {t('yourRunners')}
      </p>
      <ul className="m-0 list-none p-0">
        {runners.map((runner) => (
          <li key={runner.id} className={cn(drawer && 'border-b border-border')}>
            <Link
              data-private
              href={{ pathname: '/account', query: { runner: runner.id } }}
              {...(onNavigate ? { onClick: onNavigate } : {})}
              className={cn(
                'flex items-center gap-3 text-foreground no-underline',
                drawer ? 'min-h-16 py-2' : 'min-h-13 rounded-xl px-2.5 py-1.5 hover:bg-muted',
              )}
            >
              {drawer && (
                <span
                  aria-hidden="true"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-border bg-surface-raised font-heading text-base"
                >
                  {initials(runner.name)}
                </span>
              )}
              <span
                className={cn(
                  'flex min-w-0 flex-1 flex-col',
                  drawer ? 'items-start gap-1' : 'gap-0.5',
                )}
              >
                <span className="max-w-full truncate text-[15px] font-bold">{runner.name}</span>
                <span className="text-sm text-muted-foreground">
                  {t('runnerMeta', { distance: runner.distance, bib: runner.bibNumber })}
                </span>
                {drawer && (
                  <StatusPill tone={STAGE_TONES[runner.stage]}>
                    {status(`status.${runner.stage}`)}
                  </StatusPill>
                )}
              </span>
              {!drawer && (
                <StatusPill tone={STAGE_TONES[runner.stage]}>
                  {status(`status.${runner.stage}`)}
                </StatusPill>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
