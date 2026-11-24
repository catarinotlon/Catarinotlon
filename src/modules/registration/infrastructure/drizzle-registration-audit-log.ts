import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import type { DatabaseClient } from '@/shared/infrastructure/db/database-client';
import { registrationChanges } from '@/shared/infrastructure/db/schema';

import type {
  RegistrationAuditLog,
  RegistrationChange,
} from '../application/ports/registration-audit-log';

/** Drizzle adapter of the {@link RegistrationAuditLog} port. */
export class DrizzleRegistrationAuditLog implements RegistrationAuditLog {
  /**
   * Creates the audit log.
   *
   * @param db - The database or an open transaction.
   */
  constructor(private readonly db: DatabaseClient) {}

  async record(change: RegistrationChange): Promise<void> {
    await this.db.insert(registrationChanges).values(change);
  }

  async listFor(registrationId: string): Promise<RegistrationChange[]> {
    const rows = await this.db
      .select()
      .from(registrationChanges)
      .where(
        and(
          eq(registrationChanges.registrationId, registrationId),
          isNull(registrationChanges.deletedAt),
        ),
      )
      .orderBy(asc(registrationChanges.changedAt), asc(sql`rowid`));
    return rows.map((row) => ({
      id: row.id,
      registrationId: row.registrationId,
      changedBy: row.changedBy,
      field: row.field,
      previousValue: row.previousValue,
      newValue: row.newValue,
      changedAt: row.changedAt,
    }));
  }
}
