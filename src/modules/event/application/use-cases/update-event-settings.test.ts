import { beforeEach, describe, expect, it } from 'vitest';

import { InMemoryEmailSender } from '@/shared/domain/email';
import { InMemoryErrorReporter } from '@/shared/domain/error-reporter';

import { EMPTY_SETTINGS, type EventSettingsValues } from '../../domain/event-settings';
import { InMemoryEventSettingsRepository } from '../../infrastructure/in-memory-event-settings-repository';
import { readEventSettings } from './read-event-settings';
import { updateEventSettings } from './update-event-settings';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const bank = { beneficiary: 'Name', bank: 'Bank', clabe: '002010077777777771' };

describe('updateEventSettings', () => {
  let settings: InMemoryEventSettingsRepository;
  let emails: InMemoryEmailSender;
  let reporter: InMemoryErrorReporter;
  let nextId: number;

  function deps() {
    return {
      settings,
      emails,
      reporter,
      clock: { now: () => NOW },
      ids: { uuid: () => `version-${++nextId}` },
      passwords: {
        verify: async (userId: string, password: string) =>
          userId === 'admin-1' && password === 'correct',
      },
      admins: { adminEmails: async () => ['a@example.test', 'b@example.test'] },
      links: { settings: (locale: string) => `https://app.test/${locale}/admin/settings` },
    };
  }

  const save = (values: EventSettingsValues, password?: string) =>
    updateEventSettings(deps(), {
      adminId: 'admin-1',
      adminName: 'Admin One',
      values,
      ...(password === undefined ? {} : { password }),
    });

  beforeEach(() => {
    settings = new InMemoryEventSettingsRepository();
    emails = new InMemoryEmailSender();
    reporter = new InMemoryErrorReporter();
    nextId = 0;
  });

  it('reads empty settings before the first save', async () => {
    expect(await readEventSettings({ settings })).toEqual(EMPTY_SETTINGS);
  });

  it('makes a saved change current at once', async () => {
    await save({ ...EMPTY_SETTINGS, feeCents: 10000 });

    expect((await readEventSettings({ settings })).feeCents).toBe(10000);
  });

  it('appends a version instead of overwriting', async () => {
    await save({ ...EMPTY_SETTINGS, feeCents: 10000 });
    await save({ ...EMPTY_SETTINGS, feeCents: 20000 });

    const history = await settings.history();
    expect(history.map((version) => version.values.feeCents)).toEqual([20000, 10000]);
  });

  it('records what changed, who changed it, and when', async () => {
    await save({ ...EMPTY_SETTINGS, feeCents: 10000 });

    expect(await settings.latest()).toMatchObject({
      changedFields: ['feeCents'],
      changedBy: 'admin-1',
      createdAt: NOW,
    });
  });

  it('adds no version when nothing changed', async () => {
    await save({ ...EMPTY_SETTINGS, feeCents: 10000 });
    await save({ ...EMPTY_SETTINGS, feeCents: 10000 });

    expect(await settings.history()).toHaveLength(1);
  });

  it('rejects invalid settings without saving', async () => {
    const result = await save({ ...EMPTY_SETTINGS, feeCents: -1 });

    expect(result).toEqual({ ok: false, error: { code: 'event.invalid_fee' } });
    expect(await settings.history()).toEqual([]);
  });

  describe('bank data', () => {
    it('requires the password', async () => {
      const result = await save({ ...EMPTY_SETTINGS, bank });

      expect(result).toEqual({ ok: false, error: { code: 'event.password_required' } });
      expect(await settings.history()).toEqual([]);
    });

    it('refuses a wrong password', async () => {
      const result = await save({ ...EMPTY_SETTINGS, bank }, 'wrong');

      expect(result).toEqual({ ok: false, error: { code: 'event.wrong_password' } });
      expect(await settings.history()).toEqual([]);
    });

    it('saves with the correct password', async () => {
      await save({ ...EMPTY_SETTINGS, bank }, 'correct');

      expect((await readEventSettings({ settings })).bank).toEqual(bank);
    });

    it('alerts every admin without including the bank data', async () => {
      await save({ ...EMPTY_SETTINGS, bank }, 'correct');

      expect(emails.sent.map((email) => email.to)).toEqual(['a@example.test', 'b@example.test']);
      expect(emails.sent[0]).toMatchObject({
        template: 'bank_data_changed',
        data: { changedBy: 'Admin One', settingsUrl: 'https://app.test/es/admin/settings' },
      });
      expect(JSON.stringify(emails.sent)).not.toContain(bank.clabe);
    });

    it('needs no password when the bank data did not change', async () => {
      await save({ ...EMPTY_SETTINGS, bank }, 'correct');
      emails.sent.length = 0;

      const result = await save({ ...EMPTY_SETTINGS, bank, feeCents: 10000 });

      expect(result.ok).toBe(true);
      expect(emails.sent).toEqual([]);
    });
  });
});
