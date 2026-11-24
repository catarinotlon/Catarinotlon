import type { DomainError, Result } from '@/shared/domain/result';

import type { Registration } from '../../domain/registration';

/** Error returned when a bib number is already in use, even by a deleted row. */
export type BibNumberTaken = DomainError<'registration.bib_number_taken'>;

/**
 * Stores registrations.
 *
 * @remarks
 * There is no hard delete. Reads exclude soft-deleted rows.
 *
 * @example
 * ```ts
 * const mine = await repository.listByOwner(userId);
 * ```
 */
export interface RegistrationRepository {
  /**
   * Inserts a new registration.
   *
   * @param registration - The registration.
   * @returns Nothing, or `registration.bib_number_taken` on a collision.
   */
  insert(registration: Registration): Promise<Result<void, BibNumberTaken>>;

  /**
   * Finds an active registration.
   *
   * @param id - The registration's UUID.
   * @returns The registration, or `null` when missing or soft-deleted.
   */
  findById(id: string): Promise<Registration | null>;

  /**
   * Lists an account's active registrations, oldest first.
   *
   * @param ownerId - The account's user ID.
   * @returns The registrations.
   */
  listByOwner(ownerId: string): Promise<Registration[]>;

  /**
   * Lists every active registration, oldest first. For admin use only.
   *
   * @returns The registrations.
   */
  listAll(): Promise<Registration[]>;

  /**
   * Saves changes to an existing registration.
   *
   * @param registration - The updated registration.
   */
  update(registration: Registration): Promise<void>;

  /**
   * Marks a registration as deleted.
   *
   * @param id - The registration's UUID.
   * @param deletedBy - The user performing the deletion.
   */
  softDelete(id: string, deletedBy: string): Promise<void>;

  /**
   * Restores a soft-deleted registration.
   *
   * @param id - The registration's UUID.
   */
  restore(id: string): Promise<void>;
}
