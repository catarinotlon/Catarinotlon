/** The data printed on a ticket. The QR holds only the ticket's UUID. */
export interface TicketDocument {
  /** The locale of the document. */
  readonly locale: string;
  /** The QR content: the ticket's UUID and nothing else. */
  readonly qrPayload: string;
  /** The runner's full name. */
  readonly runnerName: string;
  /** The race distance. */
  readonly distance: string;
  /** The bib number. */
  readonly bibNumber: string;
  /** The shirt size. */
  readonly shirtSize: string;
  /** The shirt name. */
  readonly shirtName: string;
  /** The formatted event date, when set. */
  readonly eventDate: string | null;
  /** The formatted start time of the distance, when set. */
  readonly startTime: string | null;
  /** The venue, when set. */
  readonly venue: string | null;
}

/**
 * Renders a ticket as a PDF.
 *
 * @example
 * ```ts
 * const bytes = await renderer.render(document);
 * ```
 */
export interface TicketPdfRenderer {
  /**
   * Renders the document.
   *
   * @param document - The ticket's data.
   * @returns The PDF bytes.
   */
  render(document: TicketDocument): Promise<Uint8Array>;
}
