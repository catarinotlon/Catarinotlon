/** What a form's server action reports back. Messages are message keys. */
export interface FormState {
  /** A form-level error. */
  readonly formError?: string;
  /** Errors per field. */
  readonly fieldErrors?: Readonly<Record<string, string>>;
  /** Whether the action succeeded and the form should show its done state. */
  readonly done?: boolean;
}

/** The state of a form that has not been submitted. */
export const INITIAL_FORM_STATE: FormState = {};

/** A server action bound to a form. */
export type FormAction = (state: FormState, data: FormData) => Promise<FormState>;
