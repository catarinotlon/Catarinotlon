import type { TicketDocument, TicketPdfRenderer } from '../application/ports/ticket-pdf-renderer';

/** {@link TicketPdfRenderer} double that records what it was asked to render. */
export class InMemoryTicketPdfRenderer implements TicketPdfRenderer {
  /** The documents rendered so far. */
  readonly rendered: TicketDocument[] = [];

  async render(document: TicketDocument): Promise<Uint8Array> {
    this.rendered.push(document);
    return new TextEncoder().encode('%PDF-double');
  }
}
