import { describe, expect, it } from 'vitest';

import type { EmailMessage } from '@/shared/domain/email';

import { renderEmail } from './render-email';

const envelope = { to: 'runner@example.test', locale: 'es', idempotencyKey: 'key-1' };

const samples: EmailMessage[] = [
  {
    ...envelope,
    template: 'verify_email',
    data: { name: 'Sofía', url: 'https://app.test/verify' },
  },
  {
    ...envelope,
    template: 'reset_password',
    data: { name: 'Sofía', url: 'https://app.test/reset' },
  },
  {
    ...envelope,
    template: 'registration_confirmed',
    data: {
      runnerName: 'Sofía',
      distance: '5K',
      bibNumber: '48213',
      shirtName: 'SOFI',
      shirtSize: 'SIZE-A',
      accountUrl: 'https://app.test/account',
      ticketId: '7f1c2d3e-0000-4000-8000-000000000001',
      ticketPdfUrl: 'https://app.test/ticket.pdf',
    },
  },
  {
    ...envelope,
    template: 'race_reminder',
    data: {
      runnerName: 'Sofía',
      distance: '5K',
      bibNumber: '48213',
      accountUrl: 'https://app.test/account',
      daysLeft: 3,
    },
  },
  {
    ...envelope,
    template: 'shirt_name_updated',
    data: { runnerName: 'Sofía', shirtName: 'SOFI', accountUrl: 'https://app.test/account' },
  },
  {
    ...envelope,
    template: 'receipt_received',
    data: {
      runners: [{ name: 'Sofía', distance: '5K' }],
      amountCents: 12345,
      accountUrl: 'https://app.test/account',
      uploadedAt: new Date('2026-01-15T18:00:00.000Z'),
    },
  },
  {
    ...envelope,
    template: 'receipt_rejected',
    data: { reason: 'Monto distinto', uploadUrl: 'https://app.test/pay' },
  },
  {
    ...envelope,
    template: 'admin_new_receipt',
    data: {
      uploaderName: 'Sofía',
      runners: [
        { name: 'Sofía', distance: '5K' },
        { name: 'Mateo', distance: '3K' },
      ],
      amountCents: 24690,
      concept: 'CATARINOTLON - SOFIA',
      reviewUrl: 'https://app.test/admin/payments/1',
      uploadedAt: new Date('2026-01-15T18:00:00.000Z'),
    },
  },
  {
    ...envelope,
    template: 'bank_data_changed',
    data: { changedBy: 'Admin', settingsUrl: 'https://app.test/admin/settings' },
  },
];

const confirmed = samples[2] as EmailMessage;
const shirtUpdated = samples[4] as Extract<EmailMessage, { template: 'shirt_name_updated' }>;

describe('renderEmail', () => {
  describe.each(['es', 'en'])('in %s', (locale) => {
    it.each(samples.map((sample) => [sample.template, sample] as const))(
      'renders %s with a subject, HTML, and plain text',
      async (_template, sample) => {
        const email = await renderEmail({ ...sample, locale } as EmailMessage);

        expect(email.subject.length).toBeGreaterThan(0);
        expect(email.html).toContain('<html');
        expect(email.text.length).toBeGreaterThan(0);
        expect(`${email.subject}${email.text}`).not.toMatch(/catarinot[oó]n/i);
      },
    );
  });

  it('uses the recipient’s locale', async () => {
    const spanish = await renderEmail(samples[0] as EmailMessage);
    const english = await renderEmail({ ...samples[0], locale: 'en' } as EmailMessage);

    expect(spanish.subject).toBe('Confirma tu correo para activar tu cuenta');
    expect(english.subject).toBe('Confirm your email to activate your account');
  });

  it('links to the action', async () => {
    const email = await renderEmail(samples[0] as EmailMessage);

    expect(email.html).toContain('href="https://app.test/verify"');
  });

  it('escapes an untrusted shirt name', async () => {
    const email = await renderEmail({
      ...shirtUpdated,
      data: { ...shirtUpdated.data, shirtName: '<script>alert(1)</script>' },
    });

    expect(email.html).not.toContain('<script>alert(1)</script>');
    expect(email.html).toContain('&lt;script&gt;');
  });

  it('embeds the ticket QR as an inline image', async () => {
    const email = await renderEmail(confirmed);

    expect(email.html).toContain('src="cid:ticket-qr"');
    expect(email.attachments).toMatchObject([
      { filename: 'ticket-qr.png', contentId: 'ticket-qr', contentType: 'image/png' },
    ]);
    expect(email.attachments[0]?.content.subarray(1, 4).toString()).toBe('PNG');
  });

  it('omits the PDF button when there is no account to download from', async () => {
    const message = confirmed as Extract<EmailMessage, { template: 'registration_confirmed' }>;

    const email = await renderEmail({
      ...message,
      data: { ...message.data, ticketPdfUrl: null, accountUrl: null },
    });

    expect(email.html).not.toContain('Descargar boleto');
  });

  it('attaches nothing to any other email', async () => {
    const email = await renderEmail(samples[7] as EmailMessage);

    expect(email.attachments).toEqual([]);
  });

  it('formats the amount as currency in the recipient’s locale', async () => {
    const email = await renderEmail(samples[5] as EmailMessage);

    expect(email.text).toContain('$123.45');
  });

  it.each([
    [3, 'es', 'Faltan 3 días para tu carrera'],
    [1, 'es', 'Tu carrera es mañana'],
    [3, 'en', 'Your race is in 3 days'],
    [1, 'en', 'Your race is tomorrow'],
  ] as const)(
    'the %i-day reminder in %s says how soon the race is',
    async (daysLeft, locale, subject) => {
      const email = await renderEmail({
        ...envelope,
        locale,
        template: 'race_reminder',
        data: {
          runnerName: 'Sofía',
          distance: '5K',
          bibNumber: '48213',
          accountUrl: 'https://app.test/account',
          daysLeft,
        },
      });

      expect(email.subject).toBe(subject);
    },
  );
});
