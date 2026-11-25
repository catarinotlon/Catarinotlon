import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from './cn';

/** Props of {@link MorphButton}. */
export interface MorphButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  /** `idle` waits to be pressed, `pending` waits on the server, `done` has finished. */
  state: 'idle' | 'pending' | 'done';
  /** The label at rest. */
  children: ReactNode;
  /** What the button says while pending, such as "Sending…". Read by screen readers. */
  pendingLabel: string;
  /** What the button says once done, such as "Receipt replaced". Read by screen readers. */
  doneLabel: string;
}

/**
 * An outlined pill that shrinks into a spinning circle while it waits, then fills in
 * with a check mark when it is done.
 *
 * @remarks
 * It cannot be pressed while pending or done, so an action is never sent twice, and
 * its accessible name always says what is happening. With reduced motion it changes
 * shape without animating.
 *
 * @param props - The state, the three labels, and native button props.
 * @returns The button.
 */
export function MorphButton({
  state,
  children,
  pendingLabel,
  doneLabel,
  className,
  disabled,
  type = 'button',
  ...props
}: MorphButtonProps) {
  const resting = state === 'idle';

  return (
    <div className="flex justify-center">
      <button
        type={type}
        disabled={!resting || disabled}
        {...(state === 'pending' ? { 'aria-busy': true } : {})}
        className={cn(
          'relative flex h-13 w-full items-center justify-center overflow-hidden rounded-full border-2 border-input-border px-6 font-semibold text-foreground transition-[width,padding,background-color,border-color] duration-450 ease-[cubic-bezier(0.65,0,0.35,1)] hover:bg-muted motion-reduce:transition-none',
          !resting && 'w-13 cursor-progress px-0 hover:bg-transparent',
          state === 'done' &&
            'cursor-default border-inverse bg-inverse text-inverse-foreground hover:bg-inverse motion-safe:animate-thump motion-safe:[animation-delay:0s]',
          className,
        )}
        {...props}
      >
        <span
          aria-hidden={!resting || undefined}
          className={cn(
            'whitespace-nowrap transition-opacity duration-150 motion-reduce:transition-none',
            !resting && 'opacity-0',
          )}
        >
          {children}
        </span>
        {state === 'pending' && (
          <>
            <span className="sr-only">{pendingLabel}</span>
            <span
              aria-hidden="true"
              className="absolute inset-1.5 animate-spin rounded-full border-3 border-transparent border-t-foreground border-r-foreground motion-reduce:animate-none"
            />
          </>
        )}
        {state === 'done' && (
          <>
            <span className="sr-only">{doneLabel}</span>
            <svg viewBox="0 0 26 26" aria-hidden="true" className="absolute inset-0 m-auto size-6">
              <path
                d="M5 13.5l5 5L21 7.5"
                pathLength={1}
                strokeDasharray="1"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="fill-none stroke-current motion-safe:animate-draw-stroke motion-safe:[animation-delay:0.1s] motion-safe:[animation-duration:0.35s] motion-safe:[stroke-dashoffset:1]"
              />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}
