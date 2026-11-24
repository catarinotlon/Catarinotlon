import type { AdminGrant } from '../../domain/admin-grant';

/**
 * Storage of the admins the owner added.
 *
 * @remarks
 * Revoking soft-deletes the grant: it stops counting at once and the row is
 * kept, with who revoked it and when.
 *
 * @example
 * ```ts
 * await grants.add(grant);
 * const admins = await grants.listActive();
 * ```
 */
export interface AdminGrantRepository {
  /**
   * Lists the active grants, oldest first.
   *
   * @returns The grants.
   */
  listActive(): Promise<AdminGrant[]>;
  /**
   * Finds the active grant for an address.
   *
   * @param email - The address, lowercase.
   * @returns The grant, or `null`.
   */
  findActiveByEmail(email: string): Promise<AdminGrant | null>;
  /**
   * Stores a new grant.
   *
   * @param grant - The grant.
   */
  add(grant: AdminGrant): Promise<void>;
  /**
   * Revokes an active grant.
   *
   * @param id - The grant's UUID.
   * @param revokedBy - The owner who revoked it.
   * @param at - When.
   * @returns Whether an active grant was revoked.
   */
  revoke(id: string, revokedBy: string, at: Date): Promise<boolean>;
}
