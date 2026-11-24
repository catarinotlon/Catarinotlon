import { beforeEach, describe, expect, it } from 'vitest';

import { InMemoryEmailSender } from '@/shared/domain/email';
import { InMemoryErrorReporter } from '@/shared/domain/error-reporter';

import type { BibNumber } from '../../domain/bib-number';
import { createRegistration, type Registration } from '../../domain/registration';
import type { ShirtName } from '../../domain/shirt-name';
import { InMemoryRegistrationRepository } from '../../infrastructure/in-memory-registration-repository';
import { sendRaceReminders } from './send-race-reminders';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const THREE_DAYS_BEFORE = { eventDate: '2026-06-15', today: '2026-06-12' };
const ONE_DAY_BEFORE = { eventDate: '2026-06-15', today: '2026-06-14' };

const runner = (id: string, bib: string, overrides: Partial<Registration> = {}): Registration => ({
  ...createRegistration({
    id,
    ownerId: 'owner',
    runnerName: `Runner ${id}`,
    distance: '5K',
    shirtSize: 'size-a',
    shirtName: 'NAME' as ShirtName,
    bibNumber: bib as BibNumber,
    feeCents: 10000,
    locale: 'en',
    createdAt: NOW,
  }),
  status: 'confirmed',
  ...overrides,
});

describe('sendRaceReminders', () => {
  let registrations: InMemoryRegistrationRepository;
  let emails: InMemoryEmailSender;
  let reporter: InMemoryErrorReporter;

  const deps = () => ({
    registrations,
    emails,
    reporter,
    contact: { emailOf: async (id: string) => (id === 'owner' ? 'owner@example.test' : null) },
    links: { account: (locale: string) => `https://app.test/${locale}/account` },
  });

  beforeEach(() => {
    registrations = new InMemoryRegistrationRepository();
    emails = new InMemoryEmailSender();
    reporter = new InMemoryErrorReporter();
  });

  it('reminds each confirmed runner in their locale', async () => {
    await registrations.insert(runner('a', '11111'));

    await sendRaceReminders(deps(), THREE_DAYS_BEFORE);

    expect(emails.sent).toMatchObject([
      {
        template: 'race_reminder',
        to: 'owner@example.test',
        locale: 'en',
        data: {
          runnerName: 'Runner a',
          distance: '5K',
          bibNumber: '11111',
          accountUrl: 'https://app.test/en/account',
        },
      },
    ]);
  });

  it('skips runners who have not been confirmed', async () => {
    await registrations.insert(runner('a', '11111', { status: 'pending_payment' }));
    await registrations.insert(runner('b', '22222', { status: 'payment_in_review' }));

    expect(await sendRaceReminders(deps(), THREE_DAYS_BEFORE)).toEqual({ sent: 0, daysLeft: 3 });
    expect(emails.sent).toEqual([]);
  });

  it('uses the contact email of a registration with no account', async () => {
    await registrations.insert(
      runner('a', '11111', { ownerId: null, contactEmail: 'walkin@example.test' }),
    );

    await sendRaceReminders(deps(), THREE_DAYS_BEFORE);

    expect(emails.sent[0]?.to).toBe('walkin@example.test');
  });

  it('skips a registration with nowhere to write', async () => {
    await registrations.insert(runner('a', '11111', { ownerId: null }));

    expect(await sendRaceReminders(deps(), THREE_DAYS_BEFORE)).toEqual({ sent: 0, daysLeft: 3 });
  });

  it('does not send the same reminder twice', async () => {
    await registrations.insert(runner('a', '11111'));

    await sendRaceReminders(deps(), THREE_DAYS_BEFORE);
    await sendRaceReminders(deps(), THREE_DAYS_BEFORE);

    expect(emails.sent).toHaveLength(1);
  });

  it('sends the day-before reminder after the three-day one', async () => {
    await registrations.insert(runner('a', '11111'));

    await sendRaceReminders(deps(), THREE_DAYS_BEFORE);
    await sendRaceReminders(deps(), ONE_DAY_BEFORE);

    expect(emails.sent).toHaveLength(2);
  });

  it('keeps going when one email fails', async () => {
    await registrations.insert(runner('a', '11111'));
    await registrations.insert(runner('b', '22222'));
    const sent: string[] = [];
    emails.send = async (message) => {
      if (message.idempotencyKey.includes(':a:')) throw new Error('provider down');
      sent.push(message.idempotencyKey);
    };

    await sendRaceReminders(deps(), THREE_DAYS_BEFORE);

    expect(sent).toHaveLength(1);
    expect(reporter.reports).toHaveLength(1);
  });

  it('sends nothing on a day that is neither three days nor one day before', async () => {
    await registrations.insert(runner('a', '10001'));

    expect(
      await sendRaceReminders(deps(), { eventDate: '2026-06-15', today: '2026-06-13' }),
    ).toEqual({ sent: 0, daysLeft: null });
    expect(emails.sent).toEqual([]);
  });

  it('tells the runner how many days are left', async () => {
    await registrations.insert(runner('a', '10001'));

    await sendRaceReminders(deps(), ONE_DAY_BEFORE);

    expect(emails.sent[0]).toMatchObject({ template: 'race_reminder', data: { daysLeft: 1 } });
  });
});
