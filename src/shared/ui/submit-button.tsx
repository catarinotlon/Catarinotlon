'use client';

import { useFormStatus } from 'react-dom';

import { Button, type ButtonProps } from './button';

/** Props of {@link SubmitButton}. */
export type SubmitButtonProps = Omit<ButtonProps, 'type'>;

/**
 * A form's submit button that shows the pending state on its own.
 *
 * @remarks
 * It follows the enclosing form's action or navigation through
 * `useFormStatus`, and a form that tracks its own state can still set
 * `pending` directly.
 *
 * @param props - The button props, plus an optional explicit `pending`.
 * @returns The submit button.
 */
export function SubmitButton({ pending = false, ...props }: SubmitButtonProps) {
  const status = useFormStatus();
  return <Button type="submit" pending={pending || status.pending} {...props} />;
}
