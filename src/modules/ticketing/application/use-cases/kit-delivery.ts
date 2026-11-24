import type { Registration, RegistrationRepository } from '@/modules/registration';
import { err, ok, type DomainError, type Result } from '@/shared/domain/result';
import type { Clock, IdGenerator } from '@/shared/domain/system-ports';

import type { KitPickup } from '../../domain/kit-pickup';
import type { Ticket } from '../../domain/ticket';
import type { KitPickupRepository } from '../ports/kit-pickup-repository';
import type { TicketRepository } from '../ports/ticket-repository';

/** Ports required by the kit delivery use cases. */
export interface KitDeliveryDeps {
  /** Registration storage. */
  readonly registrations: RegistrationRepository;
  /** Ticket storage. */
  readonly tickets: TicketRepository;
  /** Delivery storage. */
  readonly pickups: KitPickupRepository;
  /** Time source. */
  readonly clock: Clock;
  /** UUID source. */
  readonly ids: IdGenerator;
}

/** Expected failures of {@link deliverKit}. */
export type DeliverKitError =
  | DomainError<'registration.not_found'>
  | DomainError<'ticketing.registration_not_confirmed'>
  | DomainError<'ticketing.kit_already_delivered'>;

/** What the kit pickup screen shows for a scanned ticket. */
export interface KitLookup {
  /** The scanned ticket. */
  readonly ticket: Ticket;
  /** The runner's registration. */
  readonly registration: Registration;
  /** The delivery in effect, or `null` when the kit is still pending. */
  readonly pickup: KitPickup | null;
}

/**
 * Marks a confirmed runner's kit as delivered.
 *
 * @remarks
 * Anyone can collect a kit by showing the ticket, so no identity check applies.
 * The caller must have verified that `adminId` is an admin.
 *
 * @param deps - The required ports.
 * @param input - The admin, the registration, and optionally who collected it.
 * @returns The delivery, or an expected error.
 *
 * @example
 * ```ts
 * await deliverKit(deps, { adminId, registrationId, collectedBy: 'A relative' });
 * ```
 */
export async function deliverKit(
  deps: KitDeliveryDeps,
  input: {
    readonly adminId: string;
    readonly registrationId: string;
    readonly collectedBy?: string;
  },
): Promise<Result<KitPickup, DeliverKitError>> {
  const registration = await deps.registrations.findById(input.registrationId);
  if (!registration) return err('registration.not_found');
  if (registration.status !== 'confirmed') return err('ticketing.registration_not_confirmed');

  if (await deps.pickups.activeFor(registration.id)) {
    return err('ticketing.kit_already_delivered');
  }

  const pickup: KitPickup = {
    id: deps.ids.uuid(),
    registrationId: registration.id,
    deliveredBy: input.adminId,
    deliveredAt: deps.clock.now(),
    collectedBy: input.collectedBy?.trim() || null,
    undoneBy: null,
    undoneAt: null,
  };
  await deps.pickups.insert(pickup);
  return ok(pickup);
}

/**
 * Undoes a kit delivery, keeping it on record.
 *
 * @param deps - The required ports.
 * @param input - The admin and the registration.
 * @returns The undone delivery, or `ticketing.kit_not_delivered`.
 *
 * @example
 * ```ts
 * await undoKitDelivery(deps, { adminId, registrationId });
 * ```
 */
export async function undoKitDelivery(
  deps: Pick<KitDeliveryDeps, 'pickups' | 'clock'>,
  input: { readonly adminId: string; readonly registrationId: string },
): Promise<Result<KitPickup, DomainError<'ticketing.kit_not_delivered'>>> {
  const pickup = await deps.pickups.activeFor(input.registrationId);
  if (!pickup) return err('ticketing.kit_not_delivered');

  const undone: KitPickup = { ...pickup, undoneBy: input.adminId, undoneAt: deps.clock.now() };
  await deps.pickups.update(undone);
  return ok(undone);
}

/**
 * Finds a runner's kit from a scanned ticket.
 *
 * @param deps - The required ports.
 * @param input - The UUID read from the QR code.
 * @returns The ticket, the registration, and the delivery, or an error.
 *
 * @example
 * ```ts
 * const kit = await findKitByTicket(deps, { ticketId });
 * ```
 */
export async function findKitByTicket(
  deps: Pick<KitDeliveryDeps, 'registrations' | 'tickets' | 'pickups'>,
  input: { readonly ticketId: string },
): Promise<Result<KitLookup, DomainError<'ticketing.ticket_not_found'>>> {
  const ticket = await deps.tickets.findById(input.ticketId);
  if (!ticket) return err('ticketing.ticket_not_found');

  const registration = await deps.registrations.findById(ticket.registrationId);
  if (!registration) return err('ticketing.ticket_not_found');

  return ok({ ticket, registration, pickup: await deps.pickups.activeFor(registration.id) });
}
