import { describe, expect, it } from 'vitest';

import type { EmailMessage } from '@/shared/domain/email';

import { buildEmailContent, EMPTY_EMAIL_CONTEXT, type EmailEventContext } from './email-content';
import { renderEmail } from './render-email';

const context: EmailEventContext = {
  eventDate: '2030-01-15',
  startTimes: { '3K': '07:00', '5K': '07:30' },
  venue: { es: 'SEDE ES', en: 'VENUE EN' },
  kitPickup: { es: 'ENTREGA ES', en: 'PICKUP EN' },
  contact: {
    fullName: 'CONTACTO',
    phone: '5500000000',
    email: 'contacto@example.test',
    whatsapp: '525500000000',
    hours: { es: 'HORARIO ES', en: 'HOURS EN' },
  },
};

const envelope = { to: 'runner@example.test', locale: 'es', idempotencyKey: 'key' };
const url = 'https://app.test/x';
const uploadedAt = new Date('2030-01-10T18:00:00.000Z');
const runners = [
  { name: 'Sofía', distance: '5K' },
  { name: 'Mateo', distance: '3K' },
];

const confirmed: EmailMessage = {
  ...envelope,
  template: 'registration_confirmed',
  data: {
    runnerName: 'Sofía Ramírez',
    distance: '5K',
    bibNumber: '48213',
    shirtName: 'SOFÍA',
    shirtSize: 'SIZE-A',
    ticketId: '7f1c2d3e-0000-4000-8000-000000000001',
    ticketPdfUrl: url,
    accountUrl: url,
  },
};
const reminder: EmailMessage = {
  ...envelope,
  template: 'race_reminder',
  data: { runnerName: 'Sofía', distance: '5K', bibNumber: '48213', accountUrl: url, daysLeft: 3 },
};
const received: EmailMessage = {
  ...envelope,
  template: 'receipt_received',
  data: { runners, amountCents: 20000, accountUrl: url, uploadedAt },
};
const rejected: EmailMessage = {
  ...envelope,
  template: 'receipt_rejected',
  data: { reason: 'El monto no coincide', uploadUrl: url },
};
const shirt: EmailMessage = {
  ...envelope,
  template: 'shirt_name_updated',
  data: { runnerName: 'Sofía', shirtName: 'SOFÍA', accountUrl: url },
};
const admin: EmailMessage = {
  ...envelope,
  template: 'admin_new_receipt',
  data: {
    uploaderName: 'Sofía Ramírez',
    runners,
    amountCents: 20000,
    concept: 'CATARINOTLON - SOFIA RAMIREZ',
    reviewUrl: url,
    uploadedAt,
  },
};
const verify: EmailMessage = {
  ...envelope,
  template: 'verify_email',
  data: { name: 'Sofía', url },
};

const occurrences = (text: string, part: string) => text.split(part).length - 1;

describe('email layout', () => {
  it('puts the confirmed runner’s data on a ticket card', () => {
    const content = buildEmailContent(confirmed, context);

    expect(content.details).toEqual([]);
    expect(content.ticket).toEqual({
      label: 'Corredor',
      runnerName: 'Sofía Ramírez',
      distance: '5K',
      rows: [
        ['Fecha', '15 de enero de 2030'],
        ['Salida', '7:30'],
        ['Sede', 'SEDE ES'],
        ['Número', '48213'],
        ['Talla', 'SIZE-A'],
        ['Playera', 'SOFÍA'],
      ],
    });
  });

  it('greets the runner by first name', () => {
    expect(buildEmailContent(confirmed, context).title).toBe('¡Ya estás dentro, Sofía!');
  });

  it('keeps the kit advice inside the kit pickup panel', () => {
    const content = buildEmailContent(confirmed, context);

    expect(content.note).toBeUndefined();
    expect(content.sections?.[0]).toMatchObject({
      title: 'Entrega de kits',
      body: 'ENTREGA ES',
      note: expect.stringContaining('otra persona puede recogerlo'),
    });
  });

  it('offers the ticket actions before the kit pickup panel', async () => {
    const { html } = await renderEmail(confirmed, context);

    expect(html.indexOf('Descargar boleto')).toBeLessThan(html.indexOf('Entrega de kits'));
  });

  it('keeps the reminder’s steps before its button', async () => {
    const { html } = await renderEmail(reminder, context);

    expect(html.indexOf('3. Cruza la meta')).toBeLessThan(html.indexOf('Ver mi boleto'));
  });

  it('does not repeat itself in the reminder', async () => {
    const { text } = await renderEmail(reminder, context);

    expect(occurrences(text, 'otra persona puede recogerlo')).toBe(1);
    expect(occurrences(text.toLowerCase(), 'medalla')).toBe(1);
  });

  it('does not repeat the next steps of a rejection', async () => {
    const { text } = await renderEmail(rejected, context);

    expect(occurrences(text, 'revisa los datos')).toBe(1);
  });

  it('calls out the rejection reason and lists no runners', () => {
    const content = buildEmailContent(rejected, context);

    expect(content.callout).toEqual({ title: 'Motivo', body: 'El monto no coincide' });
    expect(content.details).toEqual([]);
  });

  it('says what the receipt covers, with each distance', () => {
    const content = buildEmailContent(received, context);

    expect(content.details[0]).toEqual(['Inscripción', 'Sofía (5K) y Mateo (3K)']);
  });

  it('puts the receipt’s next step before its button', () => {
    const content = buildEmailContent(received, context);

    expect(content.lead).toBe('En cuanto quede confirmado te enviamos otro correo con tu boleto.');
    expect(content.note).toBeUndefined();
  });

  it('tells the admin the account and the runners covered', () => {
    const content = buildEmailContent(admin, context);

    expect(content.badge).toBe('ADMIN');
    expect(content.details.slice(0, 2)).toEqual([
      ['Cuenta', 'Sofía Ramírez'],
      ['Corredores que cubre', '2 · Sofía (5K) y Mateo (3K)'],
    ]);
  });

  it('adds the contact address to a runner’s footer', () => {
    expect(buildEmailContent(shirt, context).footerContact).toBe('contacto@example.test');
    expect(buildEmailContent(shirt, EMPTY_EMAIL_CONTEXT).footerContact).toBeUndefined();
  });

  it('does not add it to an admin’s footer', () => {
    expect(buildEmailContent(admin, context).footerContact).toBeUndefined();
  });

  it('says why a verification email arrived', () => {
    expect(buildEmailContent(verify, context).footer).toBe(
      'Recibiste este correo porque creaste una cuenta en el Catarinotlón 2026.',
    );
  });

  it('draws the brand, a pill button, and a decorative ribbon', async () => {
    const { html } = await renderEmail(verify, context);

    expect(html).toContain('CATARINOTLÓN');
    expect(html).toMatch(/border-radius:999px/);
    expect(html).toMatch(/aria-hidden="true"/);
  });
});
