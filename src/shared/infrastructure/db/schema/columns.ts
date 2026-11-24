import { integer, text } from 'drizzle-orm/sqlite-core';

/**
 * Builds the soft-delete columns every domain table must include.
 *
 * @remarks
 * `deleted_at` is `null` while the row is active. A `BEFORE DELETE` trigger on
 * each table blocks physical deletion.
 *
 * @returns The `deletedAt` and `deletedBy` column builders.
 */
export function softDeleteColumns() {
  return {
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
    deletedBy: text('deleted_by'),
  };
}
