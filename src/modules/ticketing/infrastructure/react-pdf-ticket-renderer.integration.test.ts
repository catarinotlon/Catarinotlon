import { describe, expect, it } from 'vitest';

import type { TicketDocument } from '../application/ports/ticket-pdf-renderer';
import { ReactPdfTicketRenderer } from './react-pdf-ticket-renderer';

const document: TicketDocument = {
  locale: 'es',
  qrPayload: '7f1c2d3e-0000-4000-8000-000000000001',
  runnerName: 'Sofía Ramírez Núñez',
  distance: '5K',
  bibNumber: '48213',
  shirtSize: 'size-a',
  shirtName: '<b>Peñita</b>',
  eventDate: null,
  startTime: null,
  venue: null,
};

const header = (bytes: Uint8Array) => new TextDecoder().decode(bytes.subarray(0, 5));

describe('ReactPdfTicketRenderer', () => {
  it('renders a PDF when event facts are still missing', async () => {
    const bytes = await new ReactPdfTicketRenderer().render(document);

    expect(header(bytes)).toBe('%PDF-');
  }, 30_000);

  it('renders a PDF in English with every fact set', async () => {
    const bytes = await new ReactPdfTicketRenderer().render({
      ...document,
      locale: 'en',
      eventDate: 'June 1',
      startTime: '7:00 AM',
      venue: 'Venue',
    });

    expect(header(bytes)).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(1000);
  }, 30_000);
});
