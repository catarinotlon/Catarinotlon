import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { user } from './auth';
import { softDeleteColumns } from './columns';

const timestamp = (name: string) => integer(name, { mode: 'timestamp_ms' });

/** Contact data and preferences of an account holder. */
export const accountProfiles = sqliteTable('account_profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id),
  phone: text('phone'),
  locale: text('locale').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ...softDeleteColumns(),
});

/** Which version of the legal documents a user accepted, and when. */
export const legalAcceptances = sqliteTable(
  'legal_acceptances',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    privacyVersion: text('privacy_version').notNull(),
    termsVersion: text('terms_version').notNull(),
    acceptedAt: timestamp('accepted_at').notNull(),
    ...softDeleteColumns(),
  },
  (table) => [index('legal_acceptances_user_id_idx').on(table.userId)],
);

/** One runner's registration. The bib number is never reused, even after deletion. */
export const registrations = sqliteTable(
  'registrations',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').references(() => user.id),
    runnerName: text('runner_name').notNull(),
    distance: text('distance', { enum: ['3K', '5K'] }).notNull(),
    shirtSize: text('shirt_size').notNull(),
    shirtName: text('shirt_name').notNull(),
    bibNumber: text('bib_number').notNull(),
    status: text('status', {
      enum: ['pending_payment', 'payment_in_review', 'confirmed'],
    }).notNull(),
    feeCents: integer('fee_cents').notNull(),
    locale: text('locale').notNull(),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    createdAt: timestamp('created_at').notNull(),
    ...softDeleteColumns(),
  },
  (table) => [
    uniqueIndex('registrations_bib_number_unique').on(table.bibNumber),
    index('registrations_owner_id_idx').on(table.ownerId),
  ],
);

/** Audit trail of admin and runner edits to a registration. */
export const registrationChanges = sqliteTable(
  'registration_changes',
  {
    id: text('id').primaryKey(),
    registrationId: text('registration_id')
      .notNull()
      .references(() => registrations.id),
    changedBy: text('changed_by').notNull(),
    field: text('field').notNull(),
    previousValue: text('previous_value'),
    newValue: text('new_value'),
    changedAt: timestamp('changed_at').notNull(),
    ...softDeleteColumns(),
  },
  (table) => [index('registration_changes_registration_id_idx').on(table.registrationId)],
);

/** The ticket issued when a registration is confirmed. */
export const tickets = sqliteTable(
  'tickets',
  {
    id: text('id').primaryKey(),
    registrationId: text('registration_id')
      .notNull()
      .references(() => registrations.id),
    issuedAt: timestamp('issued_at').notNull(),
    ...softDeleteColumns(),
  },
  (table) => [
    uniqueIndex('tickets_active_registration_unique')
      .on(table.registrationId)
      .where(sql`deleted_at IS NULL`),
  ],
);

/** One bank transfer, backed by a receipt, covering one or more registrations. */
export const payments = sqliteTable(
  'payments',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id),
    concept: text('concept').notNull(),
    status: text('status', { enum: ['in_review', 'confirmed', 'rejected'] }).notNull(),
    amountCents: integer('amount_cents').notNull(),
    rejectionReason: text('rejection_reason'),
    reviewedBy: text('reviewed_by'),
    reviewedAt: timestamp('reviewed_at'),
    createdAt: timestamp('created_at').notNull(),
    ...softDeleteColumns(),
  },
  (table) => [index('payments_owner_id_idx').on(table.ownerId)],
);

/** The registrations covered by each payment. */
export const paymentRegistrations = sqliteTable(
  'payment_registrations',
  {
    id: text('id').primaryKey(),
    paymentId: text('payment_id')
      .notNull()
      .references(() => payments.id),
    registrationId: text('registration_id')
      .notNull()
      .references(() => registrations.id),
    ...softDeleteColumns(),
  },
  (table) => [
    index('payment_registrations_payment_id_idx').on(table.paymentId),
    index('payment_registrations_registration_id_idx').on(table.registrationId),
  ],
);

/** Metadata of uploaded receipts. Files are kept indefinitely. */
export const receipts = sqliteTable(
  'receipts',
  {
    id: text('id').primaryKey(),
    paymentId: text('payment_id')
      .notNull()
      .references(() => payments.id),
    pathname: text('pathname').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    position: integer('position').notNull().default(0),
    uploadedAt: timestamp('uploaded_at').notNull(),
    ...softDeleteColumns(),
  },
  (table) => [index('receipts_payment_id_idx').on(table.paymentId)],
);

/** Kit deliveries, including undone ones. */
export const kitPickups = sqliteTable(
  'kit_pickups',
  {
    id: text('id').primaryKey(),
    registrationId: text('registration_id')
      .notNull()
      .references(() => registrations.id),
    deliveredBy: text('delivered_by').notNull(),
    deliveredAt: timestamp('delivered_at').notNull(),
    collectedBy: text('collected_by'),
    undoneBy: text('undone_by'),
    undoneAt: timestamp('undone_at'),
    ...softDeleteColumns(),
  },
  (table) => [index('kit_pickups_registration_id_idx').on(table.registrationId)],
);

/** Append-only history of event settings. The latest version is current. */
export const eventSettingsVersions = sqliteTable(
  'event_settings_versions',
  {
    id: text('id').primaryKey(),
    values: text('values', { mode: 'json' }).notNull(),
    changedFields: text('changed_fields', { mode: 'json' }).notNull(),
    changedBy: text('changed_by').notNull(),
    createdAt: timestamp('created_at').notNull(),
    ...softDeleteColumns(),
  },
  (table) => [index('event_settings_versions_created_at_idx').on(table.createdAt)],
);

/** Who erased a registration that has no account, and when. */
export const registrationErasureRecords = sqliteTable('registration_erasure_records', {
  id: text('id').primaryKey(),
  registrationId: text('registration_id')
    .notNull()
    .references(() => registrations.id),
  performedBy: text('performed_by').notNull(),
  performedAt: timestamp('performed_at').notNull(),
  ...softDeleteColumns(),
});

/** Record of each personal-data erasure that was carried out. */
export const erasureRecords = sqliteTable('erasure_records', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  performedBy: text('performed_by').notNull(),
  performedAt: timestamp('performed_at').notNull(),
  ...softDeleteColumns(),
});
