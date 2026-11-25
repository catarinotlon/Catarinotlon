import { cn } from './cn';

/** Props of {@link RaceBib}. */
export interface RaceBibProps {
  /** The five-digit bib number to print. */
  number: string;
  /** The race distance printed in the corner pill; a sample bib may name both. */
  distance: '3K' | '5K' | '3K/5K';
  /** The event name, already localized (it is a proper name, so it never changes). */
  brand: string;
  /** The edition year, printed in the accent color. */
  year: string;
  /** The localized accessible name of the whole bib. */
  label: string;
  /** Extra classes for the outer box, which sets the bib's width. */
  className?: string;
}

/**
 * Draws the race bib a runner wears on the front of the shirt.
 *
 * @remarks
 * A black bib with the ladybug and the event name, the distance in a pill, the number
 * as large as fits, and the red ribbon strip with black dots from the medal. Every size
 * inside it is relative to its own width (container query units), so it keeps its
 * proportions from a small card to a full section. The ink background is the same in
 * both themes; a border keeps its edge visible on dark surfaces.
 *
 * @param props - The number, distance, printed brand and year, and accessible name.
 * @returns The bib, exposed as one image.
 *
 * @example
 * ```tsx
 * <RaceBib number="48213" distance="5K" brand="Catarinotlón" year="2026" label="Race bib 48213, 5K" />
 * ```
 */
export function RaceBib({ number, distance, brand, year, label, className }: RaceBibProps) {
  return (
    <div className={cn('@container w-full', className)}>
      <div
        role="img"
        aria-label={label}
        className="flex aspect-[10/7] flex-col rounded-[3.5cqw] border border-border bg-ink px-[5.3cqw] py-[4.4cqw] text-primary-foreground"
      >
        <div aria-hidden="true" className="flex items-center justify-between gap-[2cqw]">
          <span className="flex min-w-0 items-center gap-[2cqw]">
            <svg viewBox="0 0 40 40" className="size-[6.3cqw] shrink-0">
              <circle cx="20" cy="10" r="6.5" fill="var(--primary-foreground)" />
              <circle cx="20" cy="23" r="14" fill="var(--primary)" />
              <path d="M20 9.5v27.5" stroke="var(--ink)" strokeWidth="2.2" />
              <circle cx="13.5" cy="19" r="3" fill="var(--ink)" />
              <circle cx="26.5" cy="19" r="3" fill="var(--ink)" />
              <circle cx="13" cy="28.5" r="2.6" fill="var(--ink)" />
              <circle cx="27" cy="28.5" r="2.6" fill="var(--ink)" />
            </svg>
            <span className="truncate font-heading text-[5.6cqw] leading-none uppercase">
              {brand} <span className="text-on-ink-accent">{year}</span>
            </span>
          </span>
          <span className="shrink-0 rounded-full border-[0.5cqw] border-primary-foreground px-[2.8cqw] font-heading text-[4.7cqw] leading-tight">
            {distance}
          </span>
        </div>
        <div
          aria-hidden="true"
          className="flex flex-1 items-center justify-center font-display text-[36cqw] leading-none font-extrabold tracking-[-0.01em]"
        >
          {number}
        </div>
        <div
          aria-hidden="true"
          data-testid="bib-ribbon"
          className="h-[2.2cqw] rounded-full bg-primary bg-[radial-gradient(var(--ink)_0.47cqw,transparent_0.55cqw)] bg-[length:2.2cqw_2.2cqw] bg-center"
        />
      </div>
    </div>
  );
}
