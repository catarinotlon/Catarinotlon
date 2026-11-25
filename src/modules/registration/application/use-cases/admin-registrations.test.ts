import { beforeEach, describe, expect, it } from 'vitest';

import { InMemoryEmailSender } from '@/shared/domain/email';
import { InMemoryErrorReporter } from '@/shared/domain/error-reporter';

import type { BibNumber } from '../../domain/bib-number';
import { createRegistration, type Registration } from '../../domain/registration';
import type { ShirtName } from '../../domain/shirt-name';
import { InMemoryRegistrationAuditLog } from '../../infrastructure/in-memory-registration-audit-log';
import { InMemoryRegistrationRepository } from '../../infrastructure/in-memory-registration-repository';
import {
  adminEditRegistration,
  buildRegistrationsCsv,
  buildShirtNamesCsv,
  registrationTotals,
  searchRegistrations,
} from './admin-registrations';

const NOW = new Date('2026-06-02T12:00:00.000Z');
const PAST_DEADLINE = new Date('2026-06-01T12:00:00.000Z');

function runner(overrides: Partial<Registration> & { id: string }): Registration {
  return {
    ...createRegistration({
      id: overrides.id,
      ownerId: 'owner',
      runnerName: 'Runner',
      distance: '5K',
      shirtSize: 'size-a',
      shirtName: 'NAME' as ShirtName,
      bibNumber: '10000' as BibNumber,
      feeCents: 10000,
      locale: 'es',
      createdAt: NOW,
    }),
    ...overrides,
  };
}

const sofia = runner({
  id: 'sofia',
  runnerName: 'Sofía Ramírez',
  shirtName: 'SOFI' as ShirtName,
  bibNumber: '48213' as BibNumber,
  status: 'confirmed',
});
const mateo = runner({
  id: 'mateo',
  runnerName: 'Mateo Cruz',
  shirtName: 'TEO' as ShirtName,
  bibNumber: '51234' as BibNumber,
  distance: '3K',
  shirtSize: 'size-b',
});

const paidMateo: Registration = { ...mateo, status: 'confirmed' };
const unpaid = [
  runner({ id: 'pending', runnerName: 'Pending Runner', status: 'pending_payment' }),
  runner({ id: 'review', runnerName: 'Review Runner', status: 'payment_in_review' }),
];

describe('searchRegistrations', () => {
  const all = [sofia, mateo];

  it('returns everything with no filters', () => {
    expect(searchRegistrations(all, {})).toEqual(all);
  });

  it('matches a name ignoring accents and casing', () => {
    expect(searchRegistrations(all, { query: 'sofia ramirez' })).toEqual([sofia]);
  });

  it('matches a bib number', () => {
    expect(searchRegistrations(all, { query: '51234' })).toEqual([mateo]);
  });

  it('matches a shirt name', () => {
    expect(searchRegistrations(all, { query: 'teo' })).toEqual([mateo]);
  });

  it('filters by distance', () => {
    expect(searchRegistrations(all, { distance: '3K' })).toEqual([mateo]);
  });

  it('filters by status', () => {
    expect(searchRegistrations(all, { status: 'confirmed' })).toEqual([sofia]);
  });

  it('combines the query and the filters', () => {
    expect(searchRegistrations(all, { query: 'sofia', distance: '3K' })).toEqual([]);
  });
});

describe('registrationTotals', () => {
  it('counts by distance and by status', () => {
    expect(registrationTotals([sofia, mateo])).toEqual({
      total: 2,
      byDistance: { '3K': 1, '5K': 1 },
      byStatus: { pending_payment: 1, payment_in_review: 0, confirmed: 1 },
    });
  });
});

describe('buildRegistrationsCsv', () => {
  const headers = {
    bibNumber: 'Bib',
    runnerName: 'Name',
    distance: 'Distance',
    shirtSize: 'Size',
    shirtName: 'Shirt',
    status: 'Status',
  };

  it('writes a header and one row per runner', () => {
    expect(buildRegistrationsCsv([sofia], headers)).toBe(
      'Bib,Name,Distance,Size,Shirt,Status\r\n48213,Sofía Ramírez,5K,size-a,SOFI,confirmed\r\n',
    );
  });

  it('quotes commas and doubles quotes', () => {
    const tricky = runner({ id: 'x', runnerName: 'Cruz, "Teo"', status: 'confirmed' });

    expect(buildRegistrationsCsv([tricky], headers)).toContain('"Cruz, ""Teo"""');
  });

  it('leaves out runners whose payment is not confirmed', () => {
    expect(buildRegistrationsCsv([sofia, ...unpaid], headers)).toBe(
      'Bib,Name,Distance,Size,Shirt,Status\r\n48213,Sofía Ramírez,5K,size-a,SOFI,confirmed\r\n',
    );
  });

  it.each(['=1+1', '+1', '-1', '@SUM(A1)', '\tcmd'])(
    'neutralizes the spreadsheet formula %j in untrusted text',
    (shirtName) => {
      const hostile = runner({ id: 'x', shirtName: shirtName as ShirtName, status: 'confirmed' });

      const row = buildRegistrationsCsv([hostile], headers).split('\r\n')[1] ?? '';

      expect(row.split(',')[4]?.replace(/^"/, '')).toMatch(/^'/);
    },
  );
});

describe('buildShirtNamesCsv', () => {
  it('groups shirt names by size for the printer, in size order', () => {
    const csv = buildShirtNamesCsv([sofia, paidMateo], ['size-b', 'size-a'], {
      shirtSize: 'Size',
      shirtName: 'Shirt',
      runnerName: 'Name',
    });

    expect(csv).toBe('Size,Shirt,Name\r\nsize-b,TEO,Mateo Cruz\r\nsize-a,SOFI,Sofía Ramírez\r\n');
  });

  it('leaves out runners whose payment is not confirmed', () => {
    const csv = buildShirtNamesCsv([sofia, ...unpaid], ['size-a'], {
      shirtSize: 'Size',
      shirtName: 'Shirt',
      runnerName: 'Name',
    });

    expect(csv).toBe('Size,Shirt,Name\r\nsize-a,SOFI,Sofía Ramírez\r\n');
  });

  it('keeps runners whose size is no longer on offer, at the end', () => {
    const csv = buildShirtNamesCsv([sofia, paidMateo], ['size-b'], {
      shirtSize: 'Size',
      shirtName: 'Shirt',
      runnerName: 'Name',
    });

    expect(csv.trimEnd().split('\r\n').at(-1)).toBe('size-a,SOFI,Sofía Ramírez');
  });
});

describe('adminEditRegistration', () => {
  let registrations: InMemoryRegistrationRepository;
  let audit: InMemoryRegistrationAuditLog;
  let emails: InMemoryEmailSender;
  let nextId: number;

  const deps = () => ({
    unitOfWork: {
      run: <T>(
        work: (repositories: {
          registrations: InMemoryRegistrationRepository;
          audit: InMemoryRegistrationAuditLog;
        }) => Promise<T>,
      ) => work({ registrations, audit }),
    },
    emails,
    reporter: new InMemoryErrorReporter(),
    clock: { now: () => NOW },
    ids: { uuid: () => `event-${++nextId}` },
    shirtSizes: { read: async () => ['size-a', 'size-b'] },
    contact: { emailOf: async () => 'owner@example.test' },
    links: { account: (locale: string) => `https://app.test/${locale}/account` },
  });

  const edit = (changes: {
    runnerName?: string;
    distance?: string;
    shirtSize?: string;
    shirtName?: string;
  }) => adminEditRegistration(deps(), { adminId: 'admin-1', registrationId: 'sofia', ...changes });

  beforeEach(async () => {
    registrations = new InMemoryRegistrationRepository();
    audit = new InMemoryRegistrationAuditLog();
    emails = new InMemoryEmailSender();
    nextId = 0;
    await registrations.insert(sofia);
  });

  it('corrects the runner’s data', async () => {
    await edit({ runnerName: ' Sofía R. ', distance: '3K', shirtSize: 'size-b' });

    expect(await registrations.findById('sofia')).toMatchObject({
      runnerName: 'Sofía R.',
      distance: '3K',
      shirtSize: 'size-b',
    });
  });

  it('records who changed what and when, per field', async () => {
    await edit({ distance: '3K', shirtName: 'NEW' });

    expect(audit.entries).toMatchObject([
      {
        registrationId: 'sofia',
        changedBy: 'admin-1',
        field: 'distance',
        previousValue: '5K',
        newValue: '3K',
        changedAt: NOW,
      },
      { field: 'shirtName', previousValue: 'SOFI', newValue: 'NEW' },
    ]);
  });

  it('records nothing for a field that did not change', async () => {
    await edit({ distance: '5K' });

    expect(audit.entries).toEqual([]);
  });

  it('emails the runner when the shirt name changes', async () => {
    await edit({ shirtName: 'NEW' });

    expect(emails.sent).toMatchObject([
      { template: 'shirt_name_updated', to: 'owner@example.test', data: { shirtName: 'NEW' } },
    ]);
  });

  it('sends no email for other changes', async () => {
    await edit({ distance: '3K' });

    expect(emails.sent).toEqual([]);
  });

  it('uses the contact email of a registration with no account', async () => {
    await registrations.insert(
      runner({
        id: 'walkin',
        ownerId: null,
        bibNumber: '60000' as BibNumber,
        contactEmail: 'walkin@example.test',
      }),
    );

    await adminEditRegistration(deps(), {
      adminId: 'admin-1',
      registrationId: 'walkin',
      shirtName: 'NEW',
    });

    expect(emails.sent[0]?.to).toBe('walkin@example.test');
  });

  it('can change the size regardless of the runner’s deadline', async () => {
    const result = await adminEditRegistration(
      { ...deps(), clock: { now: () => new Date(PAST_DEADLINE.getTime() + 1) } },
      { adminId: 'admin-1', registrationId: 'sofia', shirtSize: 'size-b' },
    );

    expect(result.ok).toBe(true);
  });

  it('rejects a size that is not on offer', async () => {
    expect(await edit({ shirtSize: 'size-z' })).toEqual({
      ok: false,
      error: { code: 'registration.invalid_shirt_size' },
    });
  });

  it('rejects a blank runner name and saves nothing', async () => {
    expect(await edit({ runnerName: ' ', distance: '3K' })).toEqual({
      ok: false,
      error: { code: 'registration.runner_name_required' },
    });
    expect((await registrations.findById('sofia'))?.distance).toBe('5K');
  });

  it('fails for an unknown registration', async () => {
    const result = await adminEditRegistration(deps(), {
      adminId: 'admin-1',
      registrationId: 'missing',
    });

    expect(result).toEqual({ ok: false, error: { code: 'registration.not_found' } });
  });
});
