import { and, asc, eq, isNull } from 'drizzle-orm';

import type { DatabaseClient } from '@/shared/infrastructure/db/database-client';
import { adminGrants } from '@/shared/infrastructure/db/schema';

import type { AdminGrantRepository } from '../application/ports/admin-grant-repository';
import type { AdminGrant } from '../domain/admin-grant';

const toGrant = (row: typeof adminGrants.$inferSelect): AdminGrant => ({
  id: row.id,
  email: row.email,
  grantedBy: row.grantedBy,
  grantedAt: row.grantedAt,
});

/** {@link AdminGrantRepository} adapter backed by Drizzle on Turso. */
export class DrizzleAdminGrantRepository implements AdminGrantRepository {
  /**
   * Creates the adapter.
   *
   * @param db - The database client.
   */
  constructor(private readonly db: DatabaseClient) {}

  async listActive(): Promise<AdminGrant[]> {
    const rows = await this.db
      .select()
      .from(adminGrants)
      .where(isNull(adminGrants.deletedAt))
      .orderBy(asc(adminGrants.grantedAt));
    return rows.map(toGrant);
  }

  async findActiveByEmail(email: string): Promise<AdminGrant | null> {
    const [row] = await this.db
      .select()
      .from(adminGrants)
      .where(and(eq(adminGrants.email, email), isNull(adminGrants.deletedAt)))
      .limit(1);
    return row ? toGrant(row) : null;
  }

  async add(grant: AdminGrant): Promise<void> {
    await this.db.insert(adminGrants).values(grant);
  }

  async revoke(id: string, revokedBy: string, at: Date): Promise<boolean> {
    const updated = await this.db
      .update(adminGrants)
      .set({ deletedAt: at, deletedBy: revokedBy })
      .where(and(eq(adminGrants.id, id), isNull(adminGrants.deletedAt)))
      .returning({ id: adminGrants.id });
    return updated.length > 0;
  }
}
