import { beforeEach, describe, expect, it } from 'vitest';

import {
  createRegistration,
  InMemoryRegistrationRepository,
  type BibNumber,
  type Registration,
  type ShirtName,
} from '@/modules/registration';

import { InMemoryKitPickupRepository } from '../../infrastructure/in-memory-kit-pickup-repository';
import { InMemoryTicketRepository } from '../../infrastructure/in-memory-ticket-repository';
import { deliverKit, findKitByTicket, undoKitDelivery } from './kit-delivery';

const NOW = new Date('2026-06-01T12:00:00.000Z');

describe('kit delivery', () => {
  let registrations: InMemoryRegistrationRepository;
  let tickets: InMemoryTicketRepository;
  let pickups: InMemoryKitPickupRepository;
  let nextId: number;

  const deps = () => ({
    registrations,
    tickets,
    pickups,
    clock: { now: () => NOW },
    ids: { uuid: () => `pickup-${++nextId}` },
  });

  async function addRegistration(id: string, status: Registration['status']) {
    await registrations.insert({
      ...createRegistration({
        id,
        ownerId: 'owner',
        runnerName: `Runner ${id}`,
        distance: '5K',
        shirtSize: 'size-a',
        shirtName: 'NAME' as ShirtName,
        bibNumber: (id === 'confirmed' ? '11111' : '22222') as BibNumber,
        feeCents: 10000,
        locale: 'es',
        createdAt: NOW,
      }),
      status,
    });
  }

  beforeEach(async () => {
    registrations = new InMemoryRegistrationRepository();
    tickets = new InMemoryTicketRepository();
    pickups = new InMemoryKitPickupRepository();
    nextId = 0;
    await addRegistration('confirmed', 'confirmed');
    await addRegistration('pending', 'pending_payment');
    await tickets.insert({ id: 'ticket-1', registrationId: 'confirmed', issuedAt: NOW });
  });

  const deliver = (registrationId = 'confirmed', collectedBy?: string) =>
    deliverKit(deps(), {
      adminId: 'admin-1',
      registrationId,
      ...(collectedBy === undefined ? {} : { collectedBy }),
    });

  describe('deliverKit', () => {
    it('records who delivered the kit and when', async () => {
      await deliver();

      expect(await pickups.activeFor('confirmed')).toMatchObject({
        deliveredBy: 'admin-1',
        deliveredAt: NOW,
        collectedBy: null,
      });
    });

    it('records who collected it, trimmed', async () => {
      await deliver('confirmed', '  Someone Else ');

      expect((await pickups.activeFor('confirmed'))?.collectedBy).toBe('Someone Else');
    });

    it('stores a blank collector as nobody', async () => {
      await deliver('confirmed', '   ');

      expect((await pickups.activeFor('confirmed'))?.collectedBy).toBeNull();
    });

    it('refuses a registration that is not confirmed', async () => {
      expect(await deliver('pending')).toEqual({
        ok: false,
        error: { code: 'ticketing.registration_not_confirmed' },
      });
      expect(await pickups.activeFor('pending')).toBeNull();
    });

    it('refuses an unknown registration', async () => {
      expect(await deliver('missing')).toEqual({
        ok: false,
        error: { code: 'registration.not_found' },
      });
    });

    it('refuses to deliver the same kit twice', async () => {
      await deliver();

      expect(await deliver()).toEqual({
        ok: false,
        error: { code: 'ticketing.kit_already_delivered' },
      });
      expect(pickups.rows).toHaveLength(1);
    });
  });

  describe('undoKitDelivery', () => {
    const undo = () => undoKitDelivery(deps(), { adminId: 'admin-2', registrationId: 'confirmed' });

    it('makes the kit undelivered again', async () => {
      await deliver();

      await undo();

      expect(await pickups.activeFor('confirmed')).toBeNull();
    });

    it('keeps the undone delivery on record, with who undid it', async () => {
      await deliver();

      await undo();

      expect(pickups.rows).toMatchObject([
        { deliveredBy: 'admin-1', undoneBy: 'admin-2', undoneAt: NOW },
      ]);
    });

    it('allows delivering again after an undo', async () => {
      await deliver();
      await undo();

      expect((await deliver()).ok).toBe(true);
    });

    it('fails when there is nothing to undo', async () => {
      expect(await undo()).toEqual({
        ok: false,
        error: { code: 'ticketing.kit_not_delivered' },
      });
    });
  });

  describe('findKitByTicket', () => {
    it('finds the runner from the scanned ticket UUID', async () => {
      const result = await findKitByTicket(deps(), { ticketId: 'ticket-1' });

      expect(result.ok && result.value.registration.id).toBe('confirmed');
      expect(result.ok && result.value.pickup).toBeNull();
    });

    it('includes the delivery once made', async () => {
      await deliver();

      const result = await findKitByTicket(deps(), { ticketId: 'ticket-1' });

      expect(result.ok && result.value.pickup?.deliveredBy).toBe('admin-1');
    });

    it('fails for an unknown ticket', async () => {
      expect(await findKitByTicket(deps(), { ticketId: 'missing' })).toEqual({
        ok: false,
        error: { code: 'ticketing.ticket_not_found' },
      });
    });
  });
});
