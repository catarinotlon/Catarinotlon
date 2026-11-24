import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { legalAcceptances, user } from '@/shared/infrastructure/db/schema';
import { createTestDatabase, type TestDatabase } from '@/shared/infrastructure/db/test-database';

import { DrizzleAccountDirectory } from './drizzle-account-directory';

const NOW = new Date('2026-06-01T12:00:00.000Z');

describe('DrizzleAccountDirectory', () => {
  let database: TestDatabase;
  let directory: DrizzleAccountDirectory;

  beforeEach(async () => {
    database = await createTestDatabase();
    directory = new DrizzleAccountDirectory(database.db);
    await database.db
      .insert(user)
      .values({ id: 'user-1', name: 'Holder', email: 'holder@example.test' });
  });

  afterEach(() => {
    database.cleanup();
  });

  it('returns the holder’s contact with the default locale before any profile', async () => {
    expect(await directory.accountHolder('user-1')).toEqual({
      name: 'Holder',
      email: 'holder@example.test',
      locale: 'es',
    });
  });

  describe('updateDetails', () => {
    const details = { userId: 'user-1', name: 'New Name', phone: '5599', locale: 'en', at: NOW };

    it('saves the name and the phone', async () => {
      await directory.updateDetails(details);

      expect(await directory.accountHolder('user-1')).toMatchObject({
        name: 'New Name',
        locale: 'en',
      });
      expect(await directory.phoneOf('user-1')).toBe('5599');
    });

    it('changes nothing when the phone cannot be saved', async () => {
      await database.client.execute(
        `CREATE TRIGGER refuse_profile BEFORE INSERT ON account_profiles
         BEGIN SELECT RAISE(ABORT, 'refused'); END`,
      );

      await expect(directory.updateDetails(details)).rejects.toThrow();

      expect((await directory.accountHolder('user-1'))?.name).toBe('Holder');
    });
  });

  it('returns null for an unknown account', async () => {
    expect(await directory.accountHolder('missing')).toBeNull();
    expect(await directory.emailOf('missing')).toBeNull();
  });

  it('finds the account’s email', async () => {
    expect(await directory.emailOf('user-1')).toBe('holder@example.test');
  });

  it('maps every active account to its email', async () => {
    await database.db
      .insert(user)
      .values({ id: 'user-2', name: 'Other', email: 'other@example.test' });

    expect(await directory.emailsByUser()).toEqual(
      new Map([
        ['user-1', 'holder@example.test'],
        ['user-2', 'other@example.test'],
      ]),
    );
  });

  it('saves the phone and locale', async () => {
    await directory.saveProfile({ userId: 'user-1', phone: '5500000000', locale: 'en', at: NOW });

    expect(await directory.accountHolder('user-1')).toMatchObject({ locale: 'en' });
    expect(await directory.phoneOf('user-1')).toBe('5500000000');
  });

  it('updates an existing profile', async () => {
    await directory.saveProfile({ userId: 'user-1', phone: '1', locale: 'es', at: NOW });

    await directory.saveProfile({ userId: 'user-1', phone: '2', locale: 'en', at: NOW });

    expect(await directory.phoneOf('user-1')).toBe('2');
  });

  it('records which legal versions were accepted and when', async () => {
    await directory.recordLegalAcceptance({
      id: 'acceptance-1',
      userId: 'user-1',
      privacyVersion: 'privacy-1',
      termsVersion: 'terms-1',
      at: NOW,
    });

    expect(await database.db.select().from(legalAcceptances)).toMatchObject([
      { userId: 'user-1', privacyVersion: 'privacy-1', termsVersion: 'terms-1', acceptedAt: NOW },
    ]);
  });
});
