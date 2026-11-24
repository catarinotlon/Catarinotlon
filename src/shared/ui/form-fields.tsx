import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';

import { cn } from './cn';

const CONTROL_CLASSES =
  'min-h-11 w-full rounded-lg border-2 border-input-border bg-input px-3 text-foreground aria-invalid:border-primary-text';

function describedBy(ids: (string | false | undefined)[]): string | undefined {
  return ids.filter(Boolean).join(' ') || undefined;
}

function FieldMessages({
  helpId,
  help,
  errorId,
  error,
}: {
  helpId: string;
  help: string | undefined;
  errorId: string;
  error: string | undefined;
}) {
  return (
    <>
      {help && (
        <p id={helpId} className="m-0 text-sm text-muted-foreground">
          {help}
        </p>
      )}
      {error && (
        <p id={errorId} className="m-0 text-sm font-semibold text-primary-text">
          {error}
        </p>
      )}
    </>
  );
}

/** Props of {@link TextField}. */
export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> {
  /** The visible label. */
  label: string;
  /** The form field name. */
  name: string;
  /** Help text announced with the input. */
  help?: string;
  /** A translated error message. */
  error?: string | undefined;
  /** A link shown at the end of the label's line. */
  labelAction?: ReactNode;
}

/**
 * A labeled native input with help and error text.
 *
 * @param props - The label, name, messages, and native input props.
 * @returns The field.
 */
export function TextField({
  label,
  name,
  help,
  error,
  labelAction,
  className,
  ...input
}: TextFieldProps) {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <label htmlFor={id} className="font-semibold">
          {label}
        </label>
        {labelAction}
      </div>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy([help && helpId, error && errorId])}
        className={CONTROL_CLASSES}
        {...input}
      />
      <FieldMessages helpId={helpId} help={help} errorId={errorId} error={error} />
    </div>
  );
}

/** Props of {@link TextAreaField}. */
export interface TextAreaFieldProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'name'
> {
  /** The visible label. */
  label: string;
  /** The form field name. */
  name: string;
  /** Help text announced with the field. */
  help?: string;
  /** A translated error message. */
  error?: string | undefined;
}

/**
 * A labeled native multi-line input with help and error text.
 *
 * @param props - The label, name, messages, and native textarea props.
 * @returns The field.
 */
export function TextAreaField({
  label,
  name,
  help,
  error,
  className,
  rows = 3,
  ...textarea
}: TextAreaFieldProps) {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy([help && helpId, error && errorId])}
        className={cn(CONTROL_CLASSES, 'py-2')}
        {...textarea}
      />
      <FieldMessages helpId={helpId} help={help} errorId={errorId} error={error} />
    </div>
  );
}

/** Props of {@link SelectField}. */
export interface SelectFieldProps {
  /** The visible label. */
  label: string;
  /** The form field name. */
  name: string;
  /** The empty first option. */
  placeholder: string;
  /** The values on offer. */
  options: readonly string[];
  /** The initial value. */
  defaultValue?: string;
  /** Help text announced with the select. */
  help?: string;
  /** A translated error message. */
  error?: string | undefined;
}

/**
 * A labeled native select with a placeholder option.
 *
 * @param props - The label, name, options, and messages.
 * @returns The field.
 */
export function SelectField({
  label,
  name,
  placeholder,
  options,
  defaultValue = '',
  help,
  error,
}: SelectFieldProps) {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy([help && helpId, error && errorId])}
        className={CONTROL_CLASSES}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <FieldMessages helpId={helpId} help={help} errorId={errorId} error={error} />
    </div>
  );
}

/**
 * A form-level error, announced when it appears.
 *
 * @param props - The message.
 * @returns The alert.
 */
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="m-0 rounded-lg border-2 border-primary-text px-4 py-3 font-semibold text-primary-text"
    >
      {children}
    </p>
  );
}
