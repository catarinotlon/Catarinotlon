import type { AdminGrantRepository } from '../application/ports/admin-grant-repository';
import type { AdminGrant } from '../domain/admin-grant';

interface Row {
  readonly grant: AdminGrant;
  deletedAt: Date | null;
}

/** {@link AdminGrantRepository} double that keeps grants in memory. */
export class InMemoryAdminGrantRepository implements AdminGrantRepository {
  private readonly rows: Row[] = [];

  async listActive(): Promise<AdminGrant[]> {
    return this.rows
      .filter((row) => row.deletedAt === null)
      .map((row) => row.grant)
      .sort((a, b) => a.grantedAt.getTime() - b.grantedAt.getTime());
  }

  async findActiveByEmail(email: string): Promise<AdminGrant | null> {
    return (
      this.rows.find((row) => row.deletedAt === null && row.grant.email === email)?.grant ?? null
    );
  }

  async add(grant: AdminGrant): Promise<void> {
    this.rows.push({ grant, deletedAt: null });
  }

  async revoke(id: string, _revokedBy: string, at: Date): Promise<boolean> {
    const row = this.rows.find((item) => item.grant.id === id && item.deletedAt === null);
    if (!row) return false;
    row.deletedAt = at;
    return true;
  }

  /**
   * Counts every stored row, revoked ones included.
   *
   * @returns The count.
   */
  rowCount(): number {
    return this.rows.length;
  }
}
