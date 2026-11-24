/** Reports unexpected errors. Expected domain errors are never reported. */
export interface ErrorReporter {
  /**
   * Reports an unexpected error.
   *
   * @remarks
   * The context must never contain personal data.
   *
   * @param error - The error.
   * @param context - Non-personal details, such as the operation's name.
   *
   * @example
   * ```ts
   * reporter.report(error, { operation: 'submit_receipt.notify' });
   * ```
   */
  report(error: unknown, context: Readonly<Record<string, string>>): void;
}

/** {@link ErrorReporter} double that records what was reported. */
export class InMemoryErrorReporter implements ErrorReporter {
  /** Reports received so far. */
  readonly reports: { error: unknown; context: Readonly<Record<string, string>> }[] = [];

  report(error: unknown, context: Readonly<Record<string, string>>): void {
    this.reports.push({ error, context });
  }
}
