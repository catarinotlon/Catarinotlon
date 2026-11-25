'use client';

import { useTranslations } from 'next-intl';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { useRouter } from '@/i18n/navigation';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import type { FormAction } from '@/shared/ui/form-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { useStickyForm } from '@/shared/ui/use-sticky-form';

import { KitPickupPanel, KitVerdictBand, VerdictIcon, type KitRunner } from './kit-pickup-panel';
import { KitPickupSearch } from './kit-pickup-search';
import { createRepeatGuard, isTicketCode } from './kit-scan';
import { TicketScanner, type CodeOutcome } from './ticket-scanner';

/** How long the "kit handed over" confirmation stays before the camera returns. */
const DONE_MS = 1600;
/** How long "undo" stays available after a handover. */
const UNDO_MS = 5000;
/** How long the same QR code is ignored after it was read. */
const REPEAT_MS = 3000;
/** How long the result takes to slide away. */
const CLOSE_MS = 240;

/** A ticket read on the kit pickup screen and what the server found for it. */
export interface KitScan {
  /** The ticket UUID read from the QR code. */
  ticketId: string;
  /** The runner it belongs to, or `null` when no active registration has it. */
  runner: KitRunner | null;
}

/** Props of {@link KitPickupScanner}. */
export interface KitPickupScannerProps {
  /** The current search text. */
  query: string;
  /** The ticket in the address and what the server found for it. */
  scan: KitScan | null;
  /** Marks a kit as delivered. */
  deliverAction: FormAction;
  /** Undoes a delivery. */
  undoAction: FormAction;
  /** The search results, when there is a search. */
  children?: ReactNode;
}

const KIT_PICKUP = '/admin/kit-pickup';

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      className="size-6 shrink-0 animate-spin motion-reduce:animate-none"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
    >
      <path d="M12 3a9 9 0 1 1-9 9" />
    </svg>
  );
}

function ResultFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-border bg-surface">
      {children}
    </div>
  );
}

function Validating() {
  const t = useTranslations('admin.kits');
  return (
    <ResultFrame>
      <KitVerdictBand tone="bg-inverse text-inverse-foreground" icon={<Spinner />}>
        {t('verdict.validating')}
      </KitVerdictBand>
      <div className="flex flex-col gap-3 p-5">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-13 w-full rounded-full" />
      </div>
    </ResultFrame>
  );
}

function Handed({ runner }: { runner: KitRunner }) {
  const t = useTranslations('admin.kits');
  return (
    <ResultFrame>
      <KitVerdictBand tone="bg-success text-success-foreground" icon={VerdictIcon.check}>
        {t('verdict.done')}
      </KitVerdictBand>
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <div className="flex size-24 animate-pop-in items-center justify-center rounded-full bg-success text-success-foreground motion-reduce:animate-none">
          <svg
            aria-hidden="true"
            className="size-14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <p data-private className="m-0 text-lg">
          <b>{runner.runnerName}</b> · {runner.bibNumber}
        </p>
        <p className="m-0 text-sm text-muted-foreground">{t('returning')}</p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full animate-drain bg-success motion-reduce:animate-none" />
        </div>
      </div>
    </ResultFrame>
  );
}

function NotFound({
  ticketId,
  onNext,
  onSearch,
}: {
  ticketId: string;
  onNext: () => void;
  onSearch: () => void;
}) {
  const t = useTranslations('admin.kits');
  return (
    <ResultFrame>
      <KitVerdictBand tone="bg-primary text-primary-foreground" icon={VerdictIcon.stop}>
        {t('verdict.notFound')}
      </KitVerdictBand>
      <div className="flex flex-col gap-3 p-5">
        <p className="m-0">{t('notFoundBody')}</p>
        <p className="m-0 text-sm text-muted-foreground">
          {t('ticketCode')}{' '}
          <span className="font-mono font-bold text-foreground">{`${ticketId.slice(0, 8)}…`}</span>
        </p>
        <Button type="button" variant="inverse" fullWidth onClick={onNext}>
          {t('scanNext')}
        </Button>
        <Button type="button" variant="outline" fullWidth onClick={onSearch}>
          {t('searchInstead')}
        </Button>
      </div>
    </ResultFrame>
  );
}

function UndoToast({
  runner,
  undoAction,
  onClose,
}: {
  runner: KitRunner;
  undoAction: FormAction;
  onClose: () => void;
}) {
  const t = useTranslations('admin.kits');
  const busy = useTranslations('busy');
  const undo = useStickyForm(undoAction);

  useEffect(() => {
    if (undo.state.done) onClose();
  }, [undo.state, onClose]);

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 flex animate-toast-in items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-2 pl-4 shadow-xl motion-reduce:animate-none md:inset-x-auto md:right-6 md:bottom-6 md:w-96"
    >
      <span className="flex items-center gap-2 font-semibold">
        <svg
          aria-hidden="true"
          className="size-5 shrink-0 text-success"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
        <span data-private>{t('deliveredToast', { name: runner.runnerName })}</span>
      </span>
      <form action={undo.formAction} onSubmit={undo.onSubmit}>
        <input type="hidden" name="registrationId" value={runner.id} />
        <Button
          type="submit"
          variant="inverse"
          pending={undo.pending}
          pendingLabel={busy('undoing')}
        >
          {t('undo')}
        </Button>
      </form>
    </div>
  );
}

/**
 * The kit pickup screen: a camera that stays on, the search, and the result of each ticket.
 *
 * @remarks
 * On a phone the result slides up as a sheet over the camera; on a wide screen
 * it sits in a column beside it. A read ticket goes into the address (`?ticket=`)
 * so the server looks it up; until it answers, the result says it is checking.
 * After a handover the result confirms it, goes back to the camera on its own,
 * and offers a few seconds to undo. A code that is not a ticket never reaches
 * the server, and the same ticket is ignored for a moment after it was read.
 *
 * @param props - The search text, the scanned ticket, the actions, and the search results.
 * @returns The scanner, the search, and the result.
 */
export function KitPickupScanner({
  query,
  scan,
  deliverAction,
  undoAction,
  children,
}: KitPickupScannerProps) {
  const t = useTranslations('admin.kits');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [requested, setRequested] = useState<string | null>(scan?.ticketId ?? null);
  const [handed, setHanded] = useState<KitRunner | null>(null);
  const [toast, setToast] = useState<KitRunner | null>(null);
  const [closing, setClosing] = useState(false);
  const [accept] = useState(() => createRepeatGuard(REPEAT_MS));
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const open = requested !== null || handed !== null;
  const validating =
    requested !== null && handed === null && (isPending || scan?.ticketId !== requested);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const close = useCallback(
    (then?: () => void) => {
      setClosing(true);
      clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(() => {
        setClosing(false);
        setRequested(null);
        setHanded(null);
        startTransition(() => router.replace(KIT_PICKUP, { scroll: false }));
        then?.();
      }, CLOSE_MS);
    },
    [router],
  );

  const onCode = useCallback(
    (code: string): CodeOutcome => {
      const ticketId = code.trim().toLowerCase();
      if (!isTicketCode(ticketId)) return 'rejected';
      if (!accept(ticketId, Date.now())) return 'ignored';
      setToast(null);
      setRequested(ticketId);
      startTransition(() =>
        router.replace({ pathname: KIT_PICKUP, query: { ticket: ticketId } }, { scroll: false }),
      );
      return 'accepted';
    },
    [accept, router],
  );

  useEffect(() => {
    if (!handed) return;
    const timer = setTimeout(() => {
      const runner = handed;
      close(() => setToast(runner));
    }, DONE_MS);
    return () => clearTimeout(timer);
  }, [handed, close]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const searchInstead = useCallback(() => {
    close(() => document.querySelector<HTMLInputElement>('input[name="q"]')?.focus());
  }, [close]);

  const closeToast = useCallback(() => setToast(null), []);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape' && !validating && !handed) close();
  }

  let result: ReactNode = null;
  if (handed) {
    result = <Handed runner={handed} />;
  } else if (validating || !scan) {
    result = <Validating />;
  } else if (scan.runner) {
    result = (
      <KitPickupPanel
        key={scan.ticketId}
        runner={scan.runner}
        deliverAction={deliverAction}
        undoAction={undoAction}
        onDelivered={setHanded}
        onNext={() => close()}
      />
    );
  } else {
    result = <NotFound ticketId={scan.ticketId} onNext={() => close()} onSearch={searchInstead} />;
  }

  const hasResults = Boolean(children);

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] md:items-start md:gap-x-8">
      <div className="flex flex-col gap-4 md:col-start-1 md:row-start-1">
        <TicketScanner onCode={onCode} paused={open} />
        <KitPickupSearch query={query} />
      </div>

      {hasResults && (
        <div
          className={cn('flex flex-col gap-4 md:col-start-2 md:row-start-1', open && 'md:hidden')}
        >
          {children}
        </div>
      )}

      {!hasResults && !open && (
        <p className="m-0 hidden rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground md:col-start-2 md:row-start-1 md:block">
          {t('empty')}
        </p>
      )}

      {open && (
        <>
          <div
            aria-hidden="true"
            className={cn(
              'fixed inset-0 z-40 bg-black/45 md:hidden',
              closing ? 'opacity-0 transition-opacity duration-240' : 'animate-fade-in',
            )}
          />
          <section
            aria-label={t('resultLabel')}
            aria-busy={validating || undefined}
            onKeyDown={onKeyDown}
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-3xl bg-surface pt-2 shadow-2xl',
              '[&>article]:rounded-none [&>article]:border-0 [&>div]:rounded-none [&>div]:border-0',
              'md:static md:z-auto md:col-start-2 md:row-start-1 md:max-h-none md:overflow-visible md:rounded-none md:bg-transparent md:pt-0 md:shadow-none',
              'md:[&>article]:rounded-3xl md:[&>article]:border md:[&>div]:rounded-3xl md:[&>div]:border',
              'motion-reduce:animate-none',
              closing
                ? 'animate-sheet-out md:animate-panel-out'
                : 'animate-sheet-in md:animate-panel-in',
            )}
          >
            <div
              aria-hidden="true"
              className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-border md:hidden"
            />
            {result}
          </section>
        </>
      )}

      {toast && <UndoToast runner={toast} undoAction={undoAction} onClose={closeToast} />}
    </div>
  );
}
