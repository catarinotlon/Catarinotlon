'use client';

import { useTranslations } from 'next-intl';
import { useId, type CSSProperties } from 'react';

import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';

/** A point on the screen, in CSS pixels from the top left of the viewport. */
export interface ScreenPoint {
  /** Distance from the left edge. */
  x: number;
  /** Distance from the top edge. */
  y: number;
}

const FLOATING_DOTS = [
  {
    left: 'left-[8%]',
    size: 'size-2.5',
    delay: 'motion-safe:[animation-delay:1.5s]',
    tone: 'bg-ink',
  },
  {
    left: 'left-[22%]',
    size: 'size-1.5',
    delay: 'motion-safe:[animation-delay:2.1s]',
    tone: 'bg-primary-foreground',
  },
  {
    left: 'left-[37%]',
    size: 'size-2.5',
    delay: 'motion-safe:[animation-delay:1.8s]',
    tone: 'bg-ink',
  },
  {
    left: 'left-[55%]',
    size: 'size-2',
    delay: 'motion-safe:[animation-delay:2.4s]',
    tone: 'bg-primary-foreground',
  },
  {
    left: 'left-[68%]',
    size: 'size-2.5',
    delay: 'motion-safe:[animation-delay:1.6s]',
    tone: 'bg-ink',
  },
  {
    left: 'left-[82%]',
    size: 'size-1.5',
    delay: 'motion-safe:[animation-delay:2s]',
    tone: 'bg-primary-foreground',
  },
  {
    left: 'left-[92%]',
    size: 'size-2.5',
    delay: 'motion-safe:[animation-delay:2.6s]',
    tone: 'bg-ink',
  },
] as const;

/** Props of {@link ReceiptReceivedScreen}. */
export interface ReceiptReceivedScreenProps {
  /** Moves on to the next page. Called by "Continue" and by Escape. */
  onContinue: () => void;
  /** Set while the next page loads. */
  leaving: boolean;
  /** Where the red grows from, usually the submit button. Defaults to the bottom centre. */
  origin?: ScreenPoint;
}

/**
 * The full-screen, brand-red confirmation shown once a transfer receipt is recorded.
 *
 * @remarks
 * A modal `<dialog>`: the red grows in a circle from `origin`, the title rises, a ring
 * and a check mark draw themselves, and black and white dots (the ladybug's spots)
 * float up between the medal ribbon's dotted bands. It says the receipt is being
 * validated, never that the payment is confirmed: only an admin confirms it. It looks
 * the same in both themes. With reduced motion it appears at once, without animation.
 *
 * @param props - What "Continue" does, whether the next page is loading, and the origin.
 * @returns The dialog.
 */
export function ReceiptReceivedScreen({ onContinue, leaving, origin }: ReceiptReceivedScreenProps) {
  const t = useTranslations('payment');
  const busy = useTranslations('busy');
  const titleId = useId();
  const bodyId = useId();
  const growFrom = origin
    ? ({ '--origin-x': `${origin.x}px`, '--origin-y': `${origin.y}px` } as CSSProperties)
    : undefined;

  return (
    <dialog
      ref={(node) => {
        if (node && !node.open) node.showModal();
      }}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={(event) => {
        event.preventDefault();
        onContinue();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        onContinue();
      }}
      style={growFrom}
      className="fixed inset-0 m-0 h-dvh max-h-none w-dvw max-w-none overflow-hidden border-0 bg-primary p-0 text-primary-foreground backdrop:bg-transparent motion-safe:animate-reveal-circle"
    >
      <div className="relative flex h-full flex-col items-center justify-center gap-7 px-8 py-16 text-center">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-12 dotted-panel" />
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-12 dotted-panel" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {FLOATING_DOTS.map((dot) => (
            <span
              key={dot.left}
              className={cn(
                'absolute -bottom-3 rounded-full opacity-0 motion-safe:animate-float-up motion-reduce:hidden',
                dot.left,
                dot.size,
                dot.delay,
                dot.tone,
              )}
            />
          ))}
        </span>

        <h2
          id={titleId}
          className="m-0 max-w-xs font-display text-5xl leading-none font-black uppercase italic motion-safe:animate-rise-in"
        >
          {t('receivedTitle')}
        </h2>

        <div className="relative size-33">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full border-2 border-primary-foreground/70 opacity-0 motion-safe:animate-ripple motion-reduce:hidden"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full border-2 border-primary-foreground/70 opacity-0 motion-safe:animate-ripple motion-safe:[animation-delay:1.85s] motion-reduce:hidden"
          />
          <svg
            viewBox="0 0 100 100"
            aria-hidden="true"
            className="relative size-full motion-safe:animate-thump"
          >
            <circle
              cx="50"
              cy="50"
              r="48"
              pathLength={1}
              strokeDasharray="1"
              strokeWidth="3"
              strokeLinecap="round"
              className="origin-center -rotate-90 fill-none stroke-primary-foreground [transform-box:fill-box] motion-safe:animate-draw-stroke motion-safe:[stroke-dashoffset:1]"
            />
            <path
              d="M30 52l13 13 28-30"
              pathLength={1}
              strokeDasharray="1"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="fill-none stroke-primary-foreground motion-safe:animate-draw-stroke motion-safe:[animation-delay:1.2s] motion-safe:[animation-duration:0.4s] motion-safe:[stroke-dashoffset:1]"
            />
          </svg>
        </div>

        <p
          id={bodyId}
          className="m-0 max-w-xs text-lg motion-safe:animate-rise-in motion-safe:[animation-delay:1.75s]"
        >
          {t('receivedBody')}
        </p>

        <Button
          variant="outline"
          onClick={onContinue}
          pending={leaving}
          pendingLabel={busy('loadingAccount')}
          className="min-h-12 rounded-full border-primary-foreground px-7 font-display text-xl font-extrabold text-primary-foreground uppercase italic hover:bg-primary-foreground/10 motion-safe:animate-rise-in motion-safe:[animation-delay:2.05s]"
        >
          {t('receivedContinue')}
        </Button>
      </div>
    </dialog>
  );
}
