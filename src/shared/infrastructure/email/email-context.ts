import { desc, isNull, sql } from 'drizzle-orm';

import type { DatabaseClient } from '../db/database-client';
import { eventSettingsVersions } from '../db/schema';
import { EMPTY_EMAIL_CONTEXT, type EmailEventContext } from './email-content';

/**
 * Reads the event facts for an email from the latest settings version.
 *
 * @remarks
 * Only the fields an email shows are copied, so the bank data cannot reach one.
 *
 * @param db - The database.
 * @returns The event facts.
 */
export async function readEmailContext(db: DatabaseClient): Promise<EmailEventContext> {
  const [row] = await db
    .select({ values: eventSettingsVersions.values })
    .from(eventSettingsVersions)
    .where(isNull(eventSettingsVersions.deletedAt))
    .orderBy(desc(eventSettingsVersions.createdAt), desc(sql`rowid`))
    .limit(1);
  if (!row) return EMPTY_EMAIL_CONTEXT;

  const { eventDate, startTimes, venue, kitPickup, contact } = row.values as EmailEventContext;
  return { eventDate, startTimes, venue, kitPickup, contact };
}
