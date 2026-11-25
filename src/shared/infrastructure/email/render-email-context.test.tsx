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
const SENT_AT = new Date('2030-01-10T18:00:00.000Z');

const confirmed: Extract<EmailMessage, { template: 'registration_confirmed' }> = {
  ...envelope,
  template: 'registration_confirmed',
  data: {
    runnerName: 'Sofía',
    distance: '5K',
    bibNumber: '48213',
    shirtName: 'SOFI',
    shirtSize: 'SIZE-A',
    ticketId: '7f1c2d3e-0000-4000-8000-000000000001',
    accountUrl: 'https://app.test/account',
  },
};

const reminder: EmailMessage = {
  ...envelope,
  template: 'race_reminder',
  data: {
    runnerName: 'Sofía',
    distance: '3K',
    bibNumber: '48213',
    accountUrl: 'https://app.test/a',
    daysLeft: 3,
  },
};

const received: EmailMessage = {
  ...envelope,
  template: 'receipt_received',
  data: {
    runners: [{ name: 'Sofía', distance: '5K' }],
    amountCents: 10000,
    accountUrl: 'https://app.test/a',
    uploadedAt: SENT_AT,
  },
};

const rejected: EmailMessage = {
  ...envelope,
  template: 'receipt_rejected',
  data: { reason: 'Monto', uploadUrl: 'https://app.test/pay' },
};

const shirt: EmailMessage = {
  ...envelope,
  template: 'shirt_name_updated',
  data: { runnerName: 'Sofía', shirtName: 'SOFI', accountUrl: 'https://app.test/a' },
};

const admin: EmailMessage = {
  ...envelope,
  template: 'admin_new_receipt',
  data: {
    uploaderName: 'Sofía',
    runners: [{ name: 'Sofía', distance: '5K' }],
    amountCents: 10000,
    concept: 'CATARINOTLON - SOFIA',
    reviewUrl: 'https://app.test/review',
    uploadedAt: SENT_AT,
  },
};

describe('renderEmail with the event facts', () => {
  describe('registration confirmed', () => {
    it('carries the ticket data of the mock', async () => {
      const { text } = await renderEmail(confirmed, context);

      for (const value of ['15 de enero de 2030', '7:30', 'SEDE ES', 'SIZE-A', 'ENTREGA ES']) {
        expect(text).toContain(value);
      }
    });

    it('uses the start time of the runner’s distance', async () => {
      const { text } = await renderEmail(
        { ...confirmed, data: { ...confirmed.data, distance: '3K' } },
        context,
      );

      expect(text).toContain('7:00');
      expect(text).not.toContain('7:30');
    });

    it('says whether the start is in the morning or the afternoon', async () => {
      const { text } = await renderEmail(
        { ...confirmed, data: { ...confirmed.data, distance: '3K' } },
        context,
      );

      expect(text.replace(/[  ]/g, ' ')).toContain('7:00 a. m.');
    });

    it('uses the free text of the recipient’s locale', async () => {
      const { text } = await renderEmail({ ...confirmed, locale: 'en' }, context);

      expect(text).toContain('VENUE EN');
      expect(text).toContain('PICKUP EN');
      expect(text).not.toContain('SEDE ES');
    });

    it('says a fact is pending rather than inventing it', async () => {
      const { text } = await renderEmail(confirmed, EMPTY_EMAIL_CONTEXT);

      expect(text).toContain('Por confirmar');
    });

    it('links to the account, with no direct PDF download', async () => {
      const { html } = await renderEmail(confirmed, context);

      expect(html).toContain('Ver mi boleto y mi playera');
      expect(html).toContain('href="https://app.test/account"');
      expect(html).not.toMatch(/href="[^"]*pdf/i);
    });

    it('explains how to download the PDF from the account', () => {
      expect(buildEmailContent(confirmed, context).lead).toBe(
        'Para descargar tu boleto en PDF, toca «Ver mi boleto y mi playera» y luego «Descargar boleto (PDF)». Guárdalo en tu teléfono o imprímelo para la entrega de kits.',
      );
      expect(buildEmailContent({ ...confirmed, locale: 'en' }, context).lead).toBe(
        'To download your ticket as a PDF, tap “See my ticket and my shirt” and then “Download ticket (PDF)”. Save it on your phone or print it for kit pickup.',
      );
    });

    it('offers neither link to a runner with no account', async () => {
      const { html } = await renderEmail(
        { ...confirmed, data: { ...confirmed.data, accountUrl: null } },
        context,
      );

      expect(html).not.toContain('Ver mi boleto y mi playera');
      expect(html).not.toContain('Descargar boleto');
    });
  });

  describe('race reminder', () => {
    it('walks through the three steps with the real facts', async () => {
      const { html } = await renderEmail(reminder, context);

      for (const value of [
        '1. Recoge tu kit',
        'ENTREGA ES',
        '2. Día de la carrera',
        '15 de enero de 2030',
        '7:00',
        'SEDE ES',
        '3. Cruza la meta',
      ]) {
        expect(html).toContain(value);
      }
    });
  });

  describe('payment emails', () => {
    it('shows when the receipt was sent', async () => {
      const { text } = await renderEmail(received, context);

      expect(text).toContain('Comprobante enviado');
      expect(text).toContain('10 ene 2030');
    });

    it.each([
      ['received', received],
      ['rejected', rejected],
    ])('tells the runner who to contact on %s', async (_name, message) => {
      const { text } = await renderEmail(message, context);

      expect(text).toContain('Escribe a CONTACTO por WhatsApp al 5500000000');
      expect(text).toContain('HORARIO ES');
    });

    it('leaves the contact line out while no contact is configured', async () => {
      const { text } = await renderEmail(received, EMPTY_EMAIL_CONTEXT);

      expect(text).not.toContain('WhatsApp');
    });

    it('explains what to do after a rejection', async () => {
      const { html } = await renderEmail(rejected, context);

      expect(html).toContain('Qué hacer ahora');
      expect(html).toContain('Si ya transferiste y crees que es un error');
    });

    it('tells the admin when the receipt was sent', async () => {
      const { text } = await renderEmail(admin, context);

      expect(text).toContain('Enviado');
      expect(text).toContain('10 ene 2030');
    });
  });

  describe('shirt name updated', () => {
    it('says where to write if the runner did not make the change', async () => {
      const { text } = await renderEmail(shirt, context);

      expect(text).toContain('Si no hiciste este cambio, escríbenos a contacto@example.test');
    });

    it('leaves that out while no contact is configured', async () => {
      const { text } = await renderEmail(shirt, EMPTY_EMAIL_CONTEXT);

      expect(text).not.toContain('Si no hiciste este cambio');
    });
  });

  it('never puts the bank data in an email', async () => {
    const withBank = { ...context, bank: { clabe: '002010077777777771' } };

    const { html, text } = await renderEmail(received, withBank);

    expect(`${html}${text}`).not.toContain('002010077777777771');
  });
});
