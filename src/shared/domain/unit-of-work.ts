/**
 * Runs work that writes to more than one table atomically.
 *
 * @typeParam Repositories - The repositories available inside the transaction.
 *
 * @example
 * ```ts
 * await unitOfWork.run(async ({ payments, tickets }) => {
 *   await payments.update(payment);
 *   await tickets.insert(ticket);
 * });
 * ```
 */
export interface UnitOfWork<Repositories> {
  /**
   * Runs `work` in one transaction, rolling back if it throws.
   *
   * @param work - The work to run.
   * @returns What `work` returns.
   */
  run<T>(work: (repositories: Repositories) => Promise<T>): Promise<T>;
}
