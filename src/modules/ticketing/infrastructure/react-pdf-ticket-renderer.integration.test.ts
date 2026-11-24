import { existsSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import type { TicketDocument } from '../application/ports/ticket-pdf-renderer';
import { medalImagePath, ReactPdfTicketRenderer } from './react-pdf-ticket-renderer';

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

  it("shows the runner's shirt and the medal of their distance beside the QR", async () => {
    const bytes = await new ReactPdfTicketRenderer().render(document);
    const raw = new TextDecoder('latin1').decode(bytes);

    expect(raw.match(/\/Subtype\s*\/Image/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  }, 30_000);

  it('sets the ticket in the brand typography', async () => {
    const raw = new TextDecoder('latin1').decode(
      await new ReactPdfTicketRenderer().render(document),
    );

    expect(raw).toContain('BarlowCondensed');
  }, 30_000);

  it("picks the finisher medal of the runner's distance", () => {
    expect(medalImagePath('3K')).toMatch(/medal-finisher-3k\.png$/);
    expect(medalImagePath('5K')).toMatch(/medal-finisher-5k\.png$/);
    expect(existsSync(medalImagePath('3K'))).toBe(true);
    expect(existsSync(medalImagePath('5K'))).toBe(true);
  });
});
