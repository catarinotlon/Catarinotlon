import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  kitPickups,
  registrationChanges,
  registrationErasureRecords,
  registrations,
  user,
} from '@/shared/infrastructure/db/schema';
import { createTestDatabase, type TestDatabase } from '@/shared/infrastructure/db/test-database';

import { DrizzlePersonalDataEraser } from './drizzle-personal-data-eraser';

const NOW = new Date('2026-06-01T12:00:00.000Z');

const registration = (id: string, ownerId: string | null, bibNumber: string) => ({
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

describe('DrizzlePersonalDataEraser.eraseManual', () => {
  let database: TestDatabase;
  let eraser: DrizzlePersonalDataEraser;

  const request = (registrationId: string) => ({
    recordId: `record-${registrationId}`,
    registrationId,
    performedBy: 'admin',
    at: NOW,
  });
  const row = async (id: string) =>
    (await database.db.select().from(registrations).where(eq(registrations.id, id)))[0];

  beforeEach(async () => {
    database = await createTestDatabase();
    eraser = new DrizzlePersonalDataEraser(database.db);
    await database.db
      .insert(user)
      .values({ id: 'holder', name: 'Holder', email: 'h@example.test' });
    await database.db
      .insert(registrations)
      .values([
        registration('walk-in', null, '10001'),
        registration('other-walk-in', null, '10002'),
        registration('with-account', 'holder', '10003'),
      ]);
    await database.db.insert(registrationChanges).values({
      id: 'change-1',
      registrationId: 'walk-in',
      field: 'runnerName',
      previousValue: 'Older Private Name',
      newValue: 'Private Runner',
      changedBy: 'admin',
      changedAt: NOW,
    });
    await database.db.insert(kitPickups).values({
      id: 'pickup-1',
      registrationId: 'walk-in',
      deliveredBy: 'admin',
      deliveredAt: NOW,
      collectedBy: 'Private Relative',
    });
  });

  afterEach(() => {
    database.cleanup();
  });

  it('overwrites the personal fields and keeps the row and bib number', async () => {
    expect(await eraser.eraseManual(request('walk-in'))).toBe(true);

    expect(await row('walk-in')).toMatchObject({
      runnerName: 'Erased runner',
      shirtName: 'ERASED',
      contactEmail: null,
      contactPhone: null,
      bibNumber: '10001',
      deletedAt: null,
    });
  });

  it('clears the personal values in the audit trail and kit pickup', async () => {
    await eraser.eraseManual(request('walk-in'));

    expect(await database.db.select().from(registrationChanges)).toMatchObject([
      { previousValue: null, newValue: null },
    ]);
    expect(await database.db.select().from(kitPickups)).toMatchObject([{ collectedBy: null }]);
  });

  it('records when it ran and who ran it', async () => {
    await eraser.eraseManual(request('walk-in'));

    expect(await database.db.select().from(registrationErasureRecords)).toMatchObject([
      { id: 'record-walk-in', registrationId: 'walk-in', performedBy: 'admin', performedAt: NOW },
    ]);
  });

  it('leaves other registrations untouched', async () => {
    await eraser.eraseManual(request('walk-in'));

    expect((await row('other-walk-in'))?.runnerName).toBe('Private Runner');
  });

  it('refuses a registration that belongs to an account', async () => {
    expect(await eraser.eraseManual(request('with-account'))).toBe(false);

    expect((await row('with-account'))?.runnerName).toBe('Private Runner');
    expect(await database.db.select().from(registrationErasureRecords)).toEqual([]);
  });

  it('refuses an unknown registration', async () => {
    expect(await eraser.eraseManual(request('missing'))).toBe(false);
  });
});
