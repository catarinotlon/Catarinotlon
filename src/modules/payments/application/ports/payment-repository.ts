import type { Payment } from '../../domain/payment';

/**
 * Stores payments with their covered registrations and receipt history.
 *
 * @remarks
 * There is no hard delete. Reads exclude soft-deleted rows.
 *
 * @example
 * ```ts
 * const payment = await payments.findById(paymentId);
 * ```
 */
export interface PaymentRepository {
  /**
   * Inserts a payment.
   *
   * @param payment - The payment.
   */
  insert(payment: Payment): Promise<void>;

  /**
   * Finds an active payment.
   *
   * @param id - The payment's UUID.
   * @returns The payment, or `null`.
   */
  findById(id: string): Promise<Payment | null>;

  /**
   * Lists an account's active payments, oldest first.
   *
   * @param ownerId - The account's user ID.
   * @returns The payments.
   */
  listByOwner(ownerId: string): Promise<Payment[]>;

  /**
   * Lists every active payment, oldest first. For admin use only.
   *
   * @returns The payments.
   */
  listAll(): Promise<Payment[]>;

  /**
   * Saves changes to a payment, including any new receipt.
   *
   * @param payment - The updated payment.
   */
  update(payment: Payment): Promise<void>;

  /**
   * Marks a payment as deleted.
   *
   * @param id - The payment's UUID.
   * @param deletedBy - The user performing the deletion.
   */
  softDelete(id: string, deletedBy: string): Promise<void>;

  /**
   * Restores a soft-deleted payment.
   *
   * @param id - The payment's UUID.
   */
  restore(id: string): Promise<void>;
}
