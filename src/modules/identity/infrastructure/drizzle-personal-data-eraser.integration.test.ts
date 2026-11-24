import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  account,
  accountProfiles,
  erasureRecords,
  kitPickups,
  payments,
  registrationChanges,
  registrations,
  session,
  user,
} from '@/shared/infrastructure/db/schema';
import { createTestDatabase, type TestDatabase } from '@/shared/infrastructure/db/test-database';

import { DrizzlePersonalDataEraser } from './drizzle-personal-data-eraser';

const NOW = new Date('2026-06-01T12:00:00.000Z');

describe('DrizzlePersonalDataEraser', () => {
  let database: TestDatabase;

  const registration = (id: string, ownerId: string, bibNumber: string) => ({
    id,
    ownerId,
    runnerName: 'Private Runner',
    distance: '5K' as const,
    shirtSize: 'size-a',
    shirtName: 'PRIVATE',
    bibNumber,
    status: 'confirmed' as const,
    feeCents: 10000,
    locale: 'es',
    contactEmail: 'private@example.test',
    contactPhone: '5511111111',
    createdAt: NOW,
  });

  beforeEach(async () => {
    database = await createTestDatabase();
    const { db } = database;
    await db.insert(user).values([
      { id: 'target', name: 'Private Name', email: 'target@example.test', emailVerified: true },
      { id: 'other', name: 'Other Name', email: 'other@example.test', emailVerified: true },
    ]);
    await db.insert(account).values({
      id: 'credential',
      accountId: 'target',
      providerId: 'credential',
      userId: 'target',
      password: 'hash',
      accessToken: 'token',
      updatedAt: NOW,
    });
    await db.insert(session).values({
      id: 'session-1',
      token: 'session-token',
      userId: 'target',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      updatedAt: NOW,
    });
    await db
      .insert(accountProfiles)
      .values({ userId: 'target', phone: '5522222222', locale: 'es', updatedAt: NOW });
    await db
      .insert(registrations)
      .values([
        registration('reg-target', 'target', '11111'),
        registration('reg-other', 'other', '22222'),
      ]);
    await db.insert(registrationChanges).values({
      id: 'change-1',
      registrationId: 'reg-target',
      changedBy: 'admin',
      field: 'shirtName',
      previousValue: 'OLD PRIVATE',
      newValue: 'PRIVATE',
      changedAt: NOW,
    });
    await db.insert(payments).values({
      id: 'payment-1',
      ownerId: 'target',
      concept: 'CATARINOTLON - PRIVATE NAME',
      status: 'confirmed',
      amountCents: 10000,
      createdAt: NOW,
    });
    await db.insert(kitPickups).values({
      id: 'pickup-1',
      registrationId: 'reg-target',
      deliveredBy: 'admin',
      deliveredAt: NOW,
      collectedBy: 'Private Relative',
    });
    await new DrizzlePersonalDataEraser(database.db).erase({
      recordId: 'record-1',
      userId: 'target',
      performedBy: 'admin',
      at: NOW,
    });
  });

  afterEach(() => {
    database.cleanup();
  });

  it('replaces the account holder’s name and email, keeping the row', async () => {
    const [row] = await database.db.select().from(user).where(eq(user.id, 'target'));

    expect(row).toMatchObject({
      name: 'Erased user',
      email: 'erased-target@erased.invalid',
      emailVerified: false,
      image: null,
      deletedAt: null,
    });
  });

  it('removes the credentials so the account can no longer sign in', async () => {
    const [row] = await database.db.select().from(account).where(eq(account.id, 'credential'));

    expect(row).toMatchObject({ password: null, accessToken: null });
  });

  it('unlinks the provider identity so a social sign-in cannot reach the account', async () => {
    const [row] = await database.db.select().from(account).where(eq(account.id, 'credential'));

    expect(row?.accountId).toBe('erased-credential');
  });

  it('expires the account’s sessions', async () => {
    const [row] = await database.db.select().from(session).where(eq(session.id, 'session-1'));

    expect(row?.expiresAt.getTime()).toBeLessThanOrEqual(NOW.getTime());
  });

  it('clears the phone', async () => {
    const [row] = await database.db
      .select()
      .from(accountProfiles)
      .where(eq(accountProfiles.userId, 'target'));

    expect(row?.phone).toBeNull();
  });

  it('anonymizes the registration and keeps its id, bib number, and payment state', async () => {
    const [row] = await database.db
      .select()
      .from(registrations)
      .where(eq(registrations.id, 'reg-target'));

    expect(row).toMatchObject({
      id: 'reg-target',
      runnerName: 'Erased runner',
      shirtName: 'ERASED',
      contactEmail: null,
      contactPhone: null,
      bibNumber: '11111',
      status: 'confirmed',
      feeCents: 10000,
    });
  });

  it('removes personal values from the audit trail', async () => {
    const [row] = await database.db
      .select()
      .from(registrationChanges)
      .where(eq(registrationChanges.id, 'change-1'));

    expect(row).toMatchObject({ previousValue: null, newValue: null, field: 'shirtName' });
  });

  it('removes the name from the payment concept and keeps the payment', async () => {
    const [row] = await database.db.select().from(payments).where(eq(payments.id, 'payment-1'));

    expect(row).toMatchObject({
      concept: 'CATARINOTLON - ERASED',
      status: 'confirmed',
      amountCents: 10000,
    });
  });

  it('removes who collected the kit', async () => {
    const [row] = await database.db.select().from(kitPickups).where(eq(kitPickups.id, 'pickup-1'));

    expect(row?.collectedBy).toBeNull();
  });

  it('records when it ran and who ran it', async () => {
    const rows = await database.db.select().from(erasureRecords);

    expect(rows).toMatchObject([{ userId: 'target', performedBy: 'admin', performedAt: NOW }]);
  });

  it('leaves other accounts untouched', async () => {
    const [other] = await database.db.select().from(user).where(eq(user.id, 'other'));
    const [otherRegistration] = await database.db
      .select()
      .from(registrations)
      .where(eq(registrations.id, 'reg-other'));

    expect(other?.name).toBe('Other Name');
    expect(otherRegistration?.runnerName).toBe('Private Runner');
  });
});
