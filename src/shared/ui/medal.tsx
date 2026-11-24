import Image from 'next/image';

import { cn } from './cn';
import { medalImagePath, type MedalIdentity } from './medal-image';

const IMAGE_WIDTH = 540;
const IMAGE_HEIGHT = 1364;

/** Props of {@link Medal}. */
export type MedalProps = MedalIdentity & {
  /** The localized accessible name. */
  label: string;
  /** Extra classes for the image. */
  className?: string;
  /** The rendered width at each breakpoint, for responsive loading. */
  sizes?: string;
  /** Whether to load it first, for a medal at the top of the page. */
  priority?: boolean;
};

/**
 * Shows one of the eight gold medals with its ribbon.
 *
 * @remarks
 * The images have a transparent background, so they work on both themes. Their
 * lettering was corrected to read "CATARINOTLÓN 2026".
 *
 * @param props - The medal's kind, distance, place, and accessible name.
 * @returns The medal.
 */
export function Medal({
  label,
  className,
  sizes = '(max-width: 768px) 30vw, 220px',
  priority = false,
  ...medal
}: MedalProps) {
  return (
    <Image
      src={medalImagePath(medal as MedalIdentity)}
      alt={label}
      width={IMAGE_WIDTH}
      height={IMAGE_HEIGHT}
      sizes={sizes}
      priority={priority}
      className={cn('block h-auto w-full', className)}
    />
  );
}

/** Props of {@link MedalInStudio}. */
export type MedalInStudioProps = MedalProps & {
  /** Extra classes for the backdrop. */
  frameClassName?: string;
};

/**
 * Shows a medal on the studio backdrop that matches the shirt photo.
 *
 * @remarks
 * The backdrop is the same in both themes, as a photo would be.
 *
 * @param props - The medal and optional classes for its backdrop.
 * @returns The medal on its backdrop.
 */
export function MedalInStudio({ frameClassName, className, ...medal }: MedalInStudioProps) {
  return (
    <div
      className={cn(
        'flex justify-center rounded-2xl studio-backdrop p-3 shadow-xl',
        frameClassName,
      )}
    >
      <Medal
        {...(medal as MedalProps)}
        className={cn('drop-shadow-[0_10px_12px_rgb(0_0_0/0.3)]', className)}
      />
    </div>
  );
}
