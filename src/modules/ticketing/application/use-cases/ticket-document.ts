import type { RegistrationRepository } from '@/modules/registration';
import { err, ok, type DomainError, type Result } from '@/shared/domain/result';

import type { Ticket } from '../../domain/ticket';
import type { TicketPdfRenderer } from '../ports/ticket-pdf-renderer';
import type { TicketRepository } from '../ports/ticket-repository';

/** The formatted event facts printed on a ticket. */
export interface TicketFacts {
  /** The event date, when set. */
  readonly eventDate: string | null;
  /** The start time of the runner's distance, when set. */
  readonly startTime: string | null;
  /** The venue, when set. */
  readonly venue: string | null;
}

/** Reads the event facts for a ticket. */
export interface TicketFactsReader {
  /**
   * Reads the facts.
   *
   * @param input - The runner's distance and the document's locale.
   * @returns The formatted facts.
   */
  read(input: { readonly distance: string; readonly locale: string }): Promise<TicketFacts>;
}

/** Ports required by {@link downloadTicketPdf}. */
export interface DownloadTicketDeps {
  /** Registration storage. */
  readonly registrations: RegistrationRepository;
  /** Ticket storage. */
  readonly tickets: TicketRepository;
  /** PDF renderer. */
  readonly renderer: TicketPdfRenderer;
  /** Event facts. */
  readonly facts: TicketFactsReader;
}

/**
 * Builds the content of a ticket's QR code.
 *
 * @param ticket - The ticket.
 * @returns The ticket's UUID and nothing else.
 */
export function ticketQrPayload(ticket: Ticket): string {
  return ticket.id;
}

/**
 * Renders a ticket as a PDF for its owner or an admin.
 *
 * @remarks
 * Anyone else gets the same answer as for a ticket that does not exist.
 *
 * @param deps - The required ports.
 * @param input - The reader, the ticket, and the locale.
 * @returns The PDF bytes, or `ticketing.ticket_not_found`.
 *
 * @example
 * ```ts
 * const pdf = await downloadTicketPdf(deps, { userId, isAdmin, ticketId, locale });
 * ```
 */
export async function downloadTicketPdf(
  deps: DownloadTicketDeps,
  input: {
    readonly userId: string;
    readonly isAdmin: boolean;
    readonly ticketId: string;
    readonly locale: string;
  },
): Promise<Result<Uint8Array, DomainError<'ticketing.ticket_not_found'>>> {
  const ticket = await deps.tickets.findById(input.ticketId);
  if (!ticket) return err('ticketing.ticket_not_found');

  const registration = await deps.registrations.findById(ticket.registrationId);
  if (!registration || (!input.isAdmin && registration.ownerId !== input.userId)) {
    return err('ticketing.ticket_not_found');
  }

  const facts = await deps.facts.read({ distance: registration.distance, locale: input.locale });
  return ok(
    await deps.renderer.render({
      locale: input.locale,
      qrPayload: ticketQrPayload(ticket),
      runnerName: registration.runnerName,
      distance: registration.distance,
      bibNumber: registration.bibNumber,
      shirtSize: registration.shirtSize,
      shirtName: registration.shirtName,
      eventDate: facts.eventDate,
      startTime: facts.startTime,
      venue: facts.venue,
    }),
  );
}
