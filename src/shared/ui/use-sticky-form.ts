'use client';

import { startTransition, useActionState, useState, type FormEvent } from 'react';

import { INITIAL_FORM_STATE, type FormAction, type FormState } from './form-state';

/** What {@link useStickyForm} returns. */
export interface StickyForm {
  /** The latest state from the server. */
  readonly state: FormState;
  /** The form's `action`, which still works before hydration. */
  readonly formAction: (data: FormData) => void;
  /** The form's `onSubmit`, which keeps what the user typed. */
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** Whether the action is running. */
  readonly pending: boolean;
  /** The `value` of the button that sent the latest submission, if it had one. */
  readonly intent: string | null;
}

/**
 * Runs a form's server action without clearing the fields.
 *
 * @remarks
 * React resets a form after its `action` completes, which would erase the user's
 * input whenever the server reports an error. Submitting through a transition
 * avoids the reset. The submit button's name and value are kept.
 *
 * @param action - The server action.
 * @returns The state and the props for the `<form>`.
 *
 * @example
 * ```tsx
 * const { state, formAction, onSubmit, pending } = useStickyForm(action);
 * return <form action={formAction} onSubmit={onSubmit} />;
 * ```
 */
export function useStickyForm(action: FormAction): StickyForm {
  const [state, formAction, pending] = useActionState(action, INITIAL_FORM_STATE);
  const [intent, setIntent] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { submitter } = event.nativeEvent as SubmitEvent;
    const data = new FormData(event.currentTarget, submitter);
    setIntent(submitter instanceof HTMLButtonElement && submitter.value ? submitter.value : null);
    startTransition(() => formAction(data));
  }

  return { state, formAction, onSubmit, pending, intent };
}
