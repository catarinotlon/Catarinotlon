import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from './cn';

const STANDARD = 'rounded-lg px-5 py-2.5 font-semibold';

/**
 * Builds the classes of a button, for buttons and for links styled as buttons.
 */
export const buttonClasses = cva(
  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 text-center no-underline transition-colors disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: `${STANDARD} bg-primary text-primary-foreground hover:brightness-90`,
        outline: `${STANDARD} border-2 border-input-border bg-transparent text-foreground hover:bg-muted`,
        inverse: `${STANDARD} bg-inverse text-inverse-foreground hover:opacity-90`,
        ghost: `${STANDARD} bg-transparent text-foreground hover:bg-muted`,
        link: 'px-1 font-semibold text-foreground underline-offset-2 hover:underline',
        cta: 'min-h-13 rounded-full bg-primary px-6 py-3 font-display text-xl font-extrabold text-primary-foreground uppercase italic hover:brightness-90',
      },
      fullWidth: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', fullWidth: false },
  },
);

/** Props of {@link Button}. */
export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonClasses> {
  /** Set while the server works on this button's action. */
  pending?: boolean;
  /** What the button says while pending, such as "Saving…". Defaults to its own text. */
  pendingLabel?: ReactNode;
}

/**
 * A button in the brand's variants.
 *
 * @remarks
 * While `pending`, it shows a spinner and `pendingLabel`, announces itself as
 * busy, and cannot be pressed again, so an action is never sent twice.
 *
 * @param props - The variant, the pending state, and native button props.
 * @returns The button.
 */
export function Button({
  variant,
  fullWidth,
  className,
  type = 'button',
  pending = false,
  pendingLabel,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonClasses({ variant, fullWidth }), pending && 'cursor-progress', className)}
      disabled={pending || disabled}
      {...(pending ? { 'aria-busy': true } : {})}
      {...props}
    >
      {pending && (
        <span
          data-slot="spinner"
          aria-hidden="true"
          className="size-5 shrink-0 animate-spin rounded-full border-[3px] border-current border-t-transparent motion-reduce:animate-none"
        />
      )}
      {pending && pendingLabel !== undefined ? pendingLabel : children}
    </button>
  );
}
