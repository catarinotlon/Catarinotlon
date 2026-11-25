import { beforeEach, describe, expect, it } from 'vitest';

import { InMemoryEmailSender } from '@/shared/domain/email';
import { InMemoryErrorReporter } from '@/shared/domain/error-reporter';

import type { BibNumber } from '../../domain/bib-number';
import { createRegistration, type Registration } from '../../domain/registration';
import type { ShirtName } from '../../domain/shirt-name';
import { InMemoryRegistrationRepository } from '../../infrastructure/in-memory-registration-repository';
import {
  changeRunnerDistance,
  changeRunnerShirtName,
  changeRunnerShirtSize,
  listAccountRunners,
  removeAccountRunner,
} from './runner-edits';

const NOW = new Date('2026-06-02T12:00:00.000Z');
const BEFORE = new Date('2026-06-01T12:00:00.000Z');
const AFTER = new Date('2026-06-03T12:00:00.000Z');

const base: Registration = {
  ...createRegistration({
    id: 'reg-1',
    ownerId: 'owner',
    runnerName: 'Runner One',
    distance: '5K',
    shirtSize: 'size-a',
    shirtName: 'ONE' as ShirtName,
    bibNumber: '12345' as BibNumber,
    feeCents: 10000,
    locale: 'en',
    createdAt: BEFORE,
  }),
  status: 'confirmed',
};

describe('runner edits', () => {
  let registrations: InMemoryRegistrationRepository;
  let emails: InMemoryEmailSender;
  let reporter: InMemoryErrorReporter;
  let deadline: Date | null;
  let sizes: string[];
  let nextId: number;

  const deps = () => ({
    registrations,
    emails,
    reporter,
    clock: { now: () => NOW },
    ids: { uuid: () => `event-${++nextId}` },
    shirtRules: {
      read: async () => ({ deadline, shirtSizes: sizes }),
    },
    contact: { emailOf: async () => 'owner@example.test' },
    links: { account: (locale: string) => `https://app.test/${locale}/account` },
  });

  beforeEach(async () => {
    registrations = new InMemoryRegistrationRepository();
    emails = new InMemoryEmailSender();
    reporter = new InMemoryErrorReporter();
    deadline = AFTER;
    sizes = ['size-a', 'size-b'];
    nextId = 0;
    await registrations.insert(base);
  });

  describe('listAccountRunners', () => {
    it('returns the account’s runners', async () => {
      const runners = await listAccountRunners(deps(), { userId: 'owner' });

      expect(runners.map((runner) => runner.id)).toEqual(['reg-1']);
    });

    it('returns nothing for another account', async () => {
      expect(await listAccountRunners(deps(), { userId: 'intruder' })).toEqual([]);
    });
  });

  describe('changeRunnerShirtName', () => {
    const change = (userId = 'owner', shirtName = ' New ') =>
      changeRunnerShirtName(deps(), { userId, registrationId: 'reg-1', shirtName });

    it('saves the trimmed name', async () => {
      await change();

      expect((await registrations.findById('reg-1'))?.shirtName).toBe('New');
    });

    it('emails the account holder in the runner’s locale', async () => {
      await change();

      expect(emails.sent).toMatchObject([
        {
          template: 'shirt_name_updated',
          to: 'owner@example.test',
          locale: 'en',
          data: {
            runnerName: 'Runner One',
            shirtName: 'New',
            accountUrl: 'https://app.test/en/account',
          },
        },
      ]);
    });

    it('sends a new email for each later change', async () => {
      await change('owner', 'Second');
      await change('owner', 'Third');

      expect(emails.sent).toHaveLength(2);
    });

    it('does not email when the name did not change', async () => {
      await change('owner', 'ONE');

      expect(emails.sent).toEqual([]);
    });

    it('treats another account’s registration as not found', async () => {
      expect(await change('intruder')).toEqual({
        ok: false,
        error: { code: 'registration.not_found' },
      });
      expect((await registrations.findById('reg-1'))?.shirtName).toBe('ONE');
    });

    it('rejects a blank name', async () => {
      expect(await change('owner', '  ')).toEqual({
        ok: false,
        error: { code: 'registration.shirt_name_required' },
      });
    });
  });

  describe('changeRunnerDistance', () => {
    const change = (userId = 'owner', distance = '3K') =>
      changeRunnerDistance(deps(), { userId, registrationId: 'reg-1', distance });

    it('changes the distance and keeps the fee', async () => {
      await change();

      expect(await registrations.findById('reg-1')).toMatchObject({
        distance: '3K',
        feeCents: 10000,
      });
    });

    it('rejects an invalid distance', async () => {
      expect(await change('owner', '10K')).toEqual({
        ok: false,
        error: { code: 'registration.invalid_distance' },
      });
    });

    it('treats another account’s registration as not found', async () => {
      expect(await change('intruder')).toEqual({
        ok: false,
        error: { code: 'registration.not_found' },
      });
    });
  });

  describe('changeRunnerShirtSize', () => {
    const change = (userId = 'owner', shirtSize = 'size-b') =>
      changeRunnerShirtSize(deps(), { userId, registrationId: 'reg-1', shirtSize });

    it('changes the size before the deadline', async () => {
      await change();

      expect((await registrations.findById('reg-1'))?.shirtSize).toBe('size-b');
    });

    it('refuses after the deadline', async () => {
      deadline = BEFORE;

      expect(await change()).toEqual({
        ok: false,
        error: { code: 'registration.shirt_size_deadline_passed' },
      });
      expect((await registrations.findById('reg-1'))?.shirtSize).toBe('size-a');
    });

    it('rejects a size that is not on offer', async () => {
      expect(await change('owner', 'size-z')).toEqual({
        ok: false,
        error: { code: 'registration.invalid_shirt_size' },
      });
    });

    it('treats another account’s registration as not found', async () => {
      expect(await change('intruder')).toEqual({
        ok: false,
        error: { code: 'registration.not_found' },
      });
    });
  });
  describe('removeAccountRunner', () => {
    const unpaid: Registration = {
      ...base,
      id: 'reg-2',
      bibNumber: '23456' as BibNumber,
      status: 'pending_payment',
    };

    beforeEach(async () => {
      await registrations.insert(unpaid);
    });

    it('takes an unpaid runner off the account but keeps the row', async () => {
      const result = await removeAccountRunner(deps(), {
        userId: 'owner',
        registrationId: 'reg-2',
      });

      expect(result).toEqual({ ok: true, value: undefined });
      expect((await listAccountRunners(deps(), { userId: 'owner' })).map((r) => r.id)).toEqual([
        'reg-1',
      ]);
      expect(registrations.hasStoredRow('reg-2')).toBe(true);
    });

    it('refuses a runner whose payment is already confirmed', async () => {
      const result = await removeAccountRunner(deps(), {
        userId: 'owner',
        registrationId: 'reg-1',
      });

      expect(result).toEqual({ ok: false, error: { code: 'registration.not_removable' } });
      expect(await registrations.findById('reg-1')).not.toBeNull();
    });

    it('never removes another account’s runner', async () => {
      const result = await removeAccountRunner(deps(), {
        userId: 'intruder',
        registrationId: 'reg-2',
      });

      expect(result).toEqual({ ok: false, error: { code: 'registration.not_found' } });
      expect(await registrations.findById('reg-2')).not.toBeNull();
    });
  });
});
