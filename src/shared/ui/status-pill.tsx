import type { ReactNode } from 'react';

import { cn } from './cn';

const TONES = {
  solid: 'bg-inverse text-inverse-foreground',
  outline: 'border-2 border-input-border text-foreground',
  gold: 'bg-gold text-ink',
  alert: 'border-2 border-primary-text text-primary-text',
} as const;

/** Props of {@link StatusPill}. */
export interface StatusPillProps {
  /** The label. */
  children: ReactNode;
  /** `solid` is done, `outline` is waiting, `gold` needs review, `alert` needs action. */
  tone: keyof typeof TONES;
}

/**
 * A small rounded label for a state.
 *
 * @param props - The label and its tone.
 * @returns The pill.
 */
export function StatusPill({ children, tone }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap',
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/**
 * The red pill that names a race distance.
 *
 * @param props - The distance.
 * @returns The pill.
 */
export function DistancePill({ distance }: { distance: string }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary px-4 py-1 font-heading text-xl text-primary-foreground">
      {distance}
    </span>
  );
}

const ICONS = {
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  check: <path d="m5 12 5 5L20 7" />,
  key: (
    <>
      <circle cx="8" cy="15" r="5" />
      <path d="m12 11 8-8M16 7l3 3" />
    </>
  ),
  alert: (
    <path d="M12 8v5M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
  ),
} as const;

/**
 * The round red icon at the top of a status card.
 *
 * @param props - Which icon to draw, and its background.
 * @returns The decorative badge.
 */
export function IconBadge({
  icon,
  tone = 'primary',
}: {
  icon: keyof typeof ICONS;
  tone?: 'primary' | 'inverse';
}) {
  return (
    <span
      className={cn(
        'inline-flex size-16 shrink-0 items-center justify-center rounded-full',
        tone === 'primary'
          ? 'bg-primary text-primary-foreground'
          : 'bg-inverse text-inverse-foreground',
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {ICONS[icon]}
      </svg>
    </span>
  );
}
