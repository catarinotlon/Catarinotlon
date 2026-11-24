import { cn } from './cn';

/** Props of {@link Logo}. */
export interface LogoProps {
  /** Extra classes. */
  className?: string;
}

/**
 * The Catarinotlón ladybug mark with speed lines, drawn for both themes.
 *
 * @param props - Optional classes.
 * @returns The decorative mark.
 */
export function Logo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 120 64"
      aria-hidden="true"
      className={cn('h-8 w-auto', className)}
      fill="none"
      strokeLinecap="round"
    >
      <path d="M6 20h24M10 44h20" stroke="currentColor" strokeWidth="4" />
      <path d="M2 32h20" stroke="var(--primary)" strokeWidth="4" />
      <path d="M100 24l11-9M100 40l11 9" stroke="currentColor" strokeWidth="3" />
      <ellipse cx="96" cy="32" rx="9" ry="13" fill="currentColor" />
      <circle cx="68" cy="32" r="26" fill="var(--primary)" />
      <path d="M42 32h52" stroke="var(--ink)" strokeWidth="3" />
      <circle cx="58" cy="20" r="5" fill="var(--ink)" />
      <circle cx="78" cy="20" r="5" fill="var(--ink)" />
      <circle cx="58" cy="44" r="5" fill="var(--ink)" />
      <circle cx="78" cy="44" r="5" fill="var(--ink)" />
    </svg>
  );
}
