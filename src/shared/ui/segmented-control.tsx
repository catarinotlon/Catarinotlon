'use client';

import type { CSSProperties, ReactNode } from 'react';

import { cn } from './cn';

/** One choice of a {@link SegmentedControl}. */
export interface SegmentedOption {
  /** The value the choice stands for. */
  value: string;
  /** What the choice shows. */
  label: ReactNode;
}

/** Props of {@link SegmentedControl}. */
export interface SegmentedControlProps {
  /** The choices, in order. */
  options: readonly SegmentedOption[];
  /** The value of the chosen option. */
  value: string;
  /**
   * `pill`: a rounded pair, such as the medal switch. `compact`: a small pill, such as
   * the header language switch. `block`: the large form version, with a gap between choices.
   */
  variant?: 'pill' | 'compact' | 'block';
  /** The radio group's name, for the choices that are form fields. */
  name?: string;
  /** The visible label of the radio group. */
  legend?: ReactNode;
  /** Classes for the legend. */
  legendClassName?: string;
  /** Called with the new value when a radio choice is picked. */
  onChange?: (value: string) => void;
  /** The accessible name of the group when the choices are links. */
  label?: string;
  /**
   * Renders each choice as something other than a radio button, such as a link. It
   * receives the classes that give the choice its look.
   */
  renderOption?: (
    option: SegmentedOption,
    state: { selected: boolean; className: string },
  ) => ReactNode;
  /** Classes for the outer element. */
  className?: string;
}

const GAP_PX = 12;

const TRACK = {
  pill: 'rounded-full border-2 border-input-border p-0.5',
  compact: 'rounded-full border-2 border-input-border p-0.5',
  block: 'gap-3',
} as const;

const THUMB = {
  pill: 'inset-y-0.5 left-0.5 rounded-full',
  compact: 'inset-y-0.5 left-0.5 rounded-full',
  block: 'inset-y-0 left-0 rounded-lg',
} as const;

const ITEM = {
  pill: 'min-h-11 min-w-16 rounded-full px-5 font-heading text-xl',
  compact: 'h-9 min-w-11 rounded-full px-3 text-sm font-bold no-underline',
  block: 'min-h-12 rounded-lg border-2 font-heading text-2xl',
} as const;

function itemClasses(variant: keyof typeof ITEM, selected: boolean) {
  return cn(
    'relative inline-flex cursor-pointer items-center justify-center focus-within:outline-3 focus-within:outline-offset-3 focus-within:outline-focus focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus',
    ITEM[variant],
    selected ? 'text-inverse-foreground' : 'text-foreground',
    variant === 'block' &&
      (selected ? 'border-transparent' : 'border-input-border bg-input text-foreground'),
    variant === 'compact' && !selected && 'hover:bg-muted',
  );
}

function thumbStyle(variant: keyof typeof ITEM, index: number, count: number): CSSProperties {
  if (variant === 'block') {
    return {
      width: `calc((100% - ${(count - 1) * GAP_PX}px) / ${count})`,
      transform: `translateX(calc(${index} * (100% + ${GAP_PX}px)))`,
    };
  }
  return {
    width: `calc((100% - 4px) / ${count})`,
    transform: `translateX(${index * 100}%)`,
  };
}

/**
 * A row of mutually exclusive choices whose highlight slides to the chosen one.
 *
 * @remarks
 * The single toggle of the app: the medal switch, the distance pickers, and the
 * language switch all use it. By default each choice is a real radio button inside a
 * fieldset; with `renderOption` the choices can be links instead, as the language switch
 * needs. The highlight is one element that moves with a transform, so the change is
 * smooth, and it does not move for visitors who prefer reduced motion.
 *
 * @param props - The choices, the chosen value, the look, and how a choice is picked.
 * @returns The segmented control.
 *
 * @example
 * ```tsx
 * <SegmentedControl
 *   legend="Distance"
 *   name="distance"
 *   options={[{ value: '3K', label: '3K' }, { value: '5K', label: '5K' }]}
 *   value={distance}
 *   onChange={setDistance}
 * />
 * ```
 */
export function SegmentedControl({
  options,
  value,
  variant = 'pill',
  name,
  legend,
  legendClassName,
  onChange,
  label,
  renderOption,
  className,
}: SegmentedControlProps) {
  const index = options.findIndex((option) => option.value === value);
  const track = (
    <div
      className={cn('relative grid', variant === 'block' ? 'w-full' : 'w-max', TRACK[variant])}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      {...(renderOption ? { role: 'group', 'aria-label': label } : {})}
    >
      {index >= 0 && (
        <span
          aria-hidden="true"
          data-testid="segmented-thumb"
          className={cn(
            'absolute bg-inverse transition-transform duration-300 ease-out motion-reduce:transition-none',
            THUMB[variant],
          )}
          style={thumbStyle(variant, index, options.length)}
        />
      )}
      {options.map((option) => {
        const selected = option.value === value;
        const classes = itemClasses(variant, selected);
        if (renderOption) {
          return (
            <span key={option.value} className="contents">
              {renderOption(option, { selected, className: classes })}
            </span>
          );
        }
        return (
          <label key={option.value} className={classes}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange?.(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );

  if (renderOption) return <div className={className}>{track}</div>;

  return (
    <fieldset className={cn('m-0 border-0 p-0', className)}>
      {legend && <legend className={cn('p-0', legendClassName)}>{legend}</legend>}
      {track}
    </fieldset>
  );
}
