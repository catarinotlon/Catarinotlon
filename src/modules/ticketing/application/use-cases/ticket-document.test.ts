import { beforeEach, describe, expect, it } from 'vitest';

import {
  createRegistration,
  InMemoryRegistrationRepository,
  type BibNumber,
  type ShirtName,
} from '@/modules/registration';

import { InMemoryTicketPdfRenderer } from '../../infrastructure/in-memory-ticket-pdf-renderer';
import { InMemoryTicketRepository } from '../../infrastructure/in-memory-ticket-repository';
import { downloadTicketPdf, ticketQrPayload } from './ticket-document';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const facts = { eventDate: 'June 1', startTime: '07:00', venue: 'Venue' };

describe('ticketQrPayload', () => {
  it('encodes the ticket UUID and nothing else', () => {
    expect(ticketQrPayload({ id: 'ticket-uuid', registrationId: 'reg', issuedAt: NOW })).toBe(
      'ticket-uuid',
    );
  });
});

describe('downloadTicketPdf', () => {
  let registrations: InMemoryRegistrationRepository;
  let tickets: InMemoryTicketRepository;
  let renderer: InMemoryTicketPdfRenderer;

  const deps = () => ({ registrations, tickets, renderer, facts: { read: async () => facts } });
  const download = (userId: string, isAdmin = false, ticketId = 'ticket-1') =>
    downloadTicketPdf(deps(), { userId, isAdmin, ticketId, locale: 'es' });

  beforeEach(async () => {
    registrations = new InMemoryRegistrationRepository();
    tickets = new InMemoryTicketRepository();
    renderer = new InMemoryTicketPdfRenderer();
    await registrations.insert({
      ...createRegistration({
        id: 'reg-1',
        ownerId: 'owner',
        runnerName: 'Runner One',
        distance: '5K',
        shirtSize: 'size-a',
        shirtName: 'ONE' as ShirtName,
        bibNumber: '48213' as BibNumber,
        feeCents: 10000,
        locale: 'es',
        createdAt: NOW,
      }),
      status: 'confirmed',
    });
    await tickets.insert({ id: 'ticket-1', registrationId: 'reg-1', issuedAt: NOW });
  });

  it('renders the owner’s ticket with the same data as the screen', async () => {
    const result = await download('owner');

    expect(result.ok).toBe(true);
    expect(renderer.rendered).toEqual([
      {
        locale: 'es',
        qrPayload: 'ticket-1',
        runnerName: 'Runner One',
        distance: '5K',
        bibNumber: '48213',
        shirtSize: 'size-a',
        shirtName: 'ONE',
        eventDate: 'June 1',
        startTime: '07:00',
        venue: 'Venue',
      },
    ]);
  });

  it('lets an admin download any ticket', async () => {
    expect((await download('admin', true)).ok).toBe(true);
  });

  it('hides another account’s ticket', async () => {
    expect(await download('intruder')).toEqual({
      ok: false,
      error: { code: 'ticketing.ticket_not_found' },
    });
    expect(renderer.rendered).toEqual([]);
  });

  it('fails for an unknown ticket', async () => {
    expect(await download('owner', false, 'missing')).toEqual({
      ok: false,
      error: { code: 'ticketing.ticket_not_found' },
    });
  });
});
