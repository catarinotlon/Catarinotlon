import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

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
        cta: 'min-h-13 rounded-full bg-primary px-6 py-3 font-display text-xl font-extrabold text-primary-foreground uppercase italic hover:brightness-90',
      },
      fullWidth: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', fullWidth: false },
  },
);

/** Props of {@link Button}. */
export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonClasses> {}

/**
 * A native button in the brand's styles, with a 44 px touch target.
 *
 * @param props - Native button props plus `variant` and `fullWidth`.
 * @returns The button.
 */
export function Button({ variant, fullWidth, className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonClasses({ variant, fullWidth }), className)}
      {...props}
    />
  );
}
