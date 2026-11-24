import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { KitPickupRepository } from '../application/ports/kit-pickup-repository';
import type { TicketRepository } from '../application/ports/ticket-repository';
import type { KitPickup } from '../domain/kit-pickup';
import type { Ticket } from '../domain/ticket';

/** What each adapter must supply to run the shared contracts. */
export interface TicketingHarness {
  /** The ticket adapter under test. */
  readonly tickets: TicketRepository;
  /** The kit pickup adapter under test. */
  readonly pickups: KitPickupRepository;
  /** Makes a registration available. */
  addRegistration(id: string): Promise<void>;
  /** Reports whether a ticket row is still physically stored. */
  isTicketStored(id: string): Promise<boolean>;
  /** Releases the adapter's resources. */
  cleanup(): void;
}

const NOW = new Date('2026-06-01T12:00:00.000Z');
const ticket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: 'ticket-1',
  registrationId: 'reg-1',
  issuedAt: NOW,
  ...overrides,
});
const pickup = (overrides: Partial<KitPickup> = {}): KitPickup => ({
  id: 'pickup-1',
  registrationId: 'reg-1',
  deliveredBy: 'admin-1',
  deliveredAt: NOW,
  collectedBy: 'Someone',
  undoneBy: null,
  undoneAt: null,
  ...overrides,
});

/**
 * Runs the shared ticket and kit pickup contracts against an adapter pair.
 *
 * @param name - The adapters' name.
 * @param createHarness - Builds a fresh harness for each test.
 */
export function describeTicketingContracts(
  name: string,
  createHarness: () => Promise<TicketingHarness>,
): void {
  describe(`Ticketing repository contracts: ${name}`, () => {
    let harness: TicketingHarness;

    beforeEach(async () => {
      harness = await createHarness();
      await harness.addRegistration('reg-1');
      await harness.addRegistration('reg-2');
    });

    afterEach(() => {
      harness.cleanup();
    });

    describe('TicketRepository', () => {
      it('finds a ticket by id and by registration', async () => {
        await harness.tickets.insert(ticket());

        expect(await harness.tickets.findById('ticket-1')).toEqual(ticket());
        expect(await harness.tickets.findByRegistration('reg-1')).toEqual(ticket());
      });

      it('returns null for unknown values', async () => {
        expect(await harness.tickets.findById('missing')).toBeNull();
        expect(await harness.tickets.findByRegistration('reg-2')).toBeNull();
      });

      it('refuses a second active ticket for a registration', async () => {
        await harness.tickets.insert(ticket());

        await expect(harness.tickets.insert(ticket({ id: 'ticket-2' }))).rejects.toThrow();
      });

      it('hides a soft-deleted ticket and keeps it stored', async () => {
        await harness.tickets.insert(ticket());

        await harness.tickets.softDelete('ticket-1', 'admin-1');

        expect(await harness.tickets.findById('ticket-1')).toBeNull();
        expect(await harness.tickets.findByRegistration('reg-1')).toBeNull();
        expect(await harness.isTicketStored('ticket-1')).toBe(true);
      });

      it('allows a new ticket after the previous one was soft-deleted', async () => {
        await harness.tickets.insert(ticket());
        await harness.tickets.softDelete('ticket-1', 'admin-1');

        await harness.tickets.insert(ticket({ id: 'ticket-2' }));

        expect((await harness.tickets.findByRegistration('reg-1'))?.id).toBe('ticket-2');
      });

      it('brings a ticket back on restore', async () => {
        await harness.tickets.insert(ticket());
        await harness.tickets.softDelete('ticket-1', 'admin-1');

        await harness.tickets.restore('ticket-1');

        expect(await harness.tickets.findById('ticket-1')).toEqual(ticket());
      });
    });

    describe('KitPickupRepository', () => {
      it('returns the active delivery with every field intact', async () => {
        await harness.pickups.insert(pickup());

        expect(await harness.pickups.activeFor('reg-1')).toEqual(pickup());
      });

      it('returns null when nothing was delivered', async () => {
        expect(await harness.pickups.activeFor('reg-1')).toBeNull();
      });

      it('does not treat an undone delivery as active', async () => {
        await harness.pickups.insert(pickup());

        await harness.pickups.update(pickup({ undoneBy: 'admin-2', undoneAt: NOW }));

        expect(await harness.pickups.activeFor('reg-1')).toBeNull();
      });

      it('lists only the deliveries in effect', async () => {
        await harness.pickups.insert(pickup());
        await harness.pickups.insert(
          pickup({ id: 'pickup-2', registrationId: 'reg-2', undoneBy: 'admin-2', undoneAt: NOW }),
        );

        const listed = await harness.pickups.listActive();

        expect(listed.map((item) => item.id)).toEqual(['pickup-1']);
      });

      it('finds a new delivery after an undone one', async () => {
        await harness.pickups.insert(pickup({ undoneBy: 'admin-2', undoneAt: NOW }));

        await harness.pickups.insert(pickup({ id: 'pickup-2' }));

        expect((await harness.pickups.activeFor('reg-1'))?.id).toBe('pickup-2');
      });
    });
  });
}
