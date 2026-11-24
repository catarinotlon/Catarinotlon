import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { eventSettingsVersions } from '../db/schema';
import { createTestDatabase, type TestDatabase } from '../db/test-database';
import { EMPTY_EMAIL_CONTEXT } from './email-content';
import { readEmailContext } from './email-context';

const values = (venue: string) => ({
  eventDate: '2030-01-15',
  startTimes: { '3K': '07:00', '5K': '07:30' },
  venue: { es: venue, en: venue },
  kitPickup: null,
  contact: null,
  bank: { beneficiary: 'SECRET', bank: 'SECRET', clabe: '002010077777777771' },
  feeCents: 10000,
});

describe('readEmailContext', () => {
  let database: TestDatabase;

  beforeEach(async () => {
    database = await createTestDatabase();
  });

  afterEach(() => {
    database.cleanup();
  });

  const save = (id: string, venue: string, minute: number) =>
    database.db.insert(eventSettingsVersions).values({
      id,
      values: values(venue),
      changedFields: [],
      changedBy: 'admin',
      createdAt: new Date(Date.UTC(2030, 0, 1, 0, minute)),
    });

  it('is empty before the first save', async () => {
    expect(await readEmailContext(database.db)).toEqual(EMPTY_EMAIL_CONTEXT);
  });

  it('uses the latest version', async () => {
    await save('v1', 'OLD', 0);
    await save('v2', 'NEW', 1);

    expect((await readEmailContext(database.db)).venue).toEqual({ es: 'NEW', en: 'NEW' });
  });

  it('leaves the bank data out', async () => {
    await save('v1', 'VENUE', 0);

    expect(JSON.stringify(await readEmailContext(database.db))).not.toContain('SECRET');
  });
});
