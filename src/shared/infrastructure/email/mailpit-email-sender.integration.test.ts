import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { EmailMessage } from '@/shared/domain/email';

import { MailpitEmailSender } from './mailpit-email-sender';

const server = setupServer();
const SEND_URL = 'http://mailpit.test:8025/api/v1/send';

const verify: EmailMessage = {
  template: 'verify_email',
  to: 'runner@example.test',
  locale: 'es',
  idempotencyKey: 'verify:user-1',
  data: { name: 'Sofía', url: 'https://app.test/verify' },
};

const confirmed: EmailMessage = {
  template: 'registration_confirmed',
  to: 'runner@example.test',
  locale: 'es',
  idempotencyKey: 'registration_confirmed:r-1',
  data: {
    runnerName: 'Sofía Ramírez',
    distance: '5K',
    bibNumber: '48213',
    shirtName: 'SOFÍA',
    shirtSize: 'SIZE-A',
    ticketId: '7f1c2d3e-0000-4000-8000-000000000001',
    accountUrl: 'https://app.test/es/cuenta?runner=r-1',
  },
};

type Received = Record<string, unknown> & {
  Attachments?: { Content: string; Filename: string; ContentType: string; ContentID: string }[];
};

describe('MailpitEmailSender', () => {
  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  const sender = () =>
    new MailpitEmailSender({
      url: 'http://mailpit.test:8025',
      from: 'Catarinotlón <noreply@example.test>',
    });

  const capture = () => {
    const box: { body?: Received } = {};
    server.use(
      http.post(SEND_URL, async ({ request }) => {
        box.body = (await request.json()) as Received;
        return HttpResponse.json({ ID: 'message-1' });
      }),
    );
    return box;
  };

  it('sends the rendered email to the Mailpit API', async () => {
    const box = capture();

    await sender().send(verify);

    expect(box.body).toMatchObject({
      From: { Name: 'Catarinotlón', Email: 'noreply@example.test' },
      To: [{ Email: 'runner@example.test' }],
      Subject: 'Confirma tu correo para activar tu cuenta',
      Headers: { 'X-Idempotency-Key': 'verify:user-1' },
    });
    expect(box.body?.HTML).toContain('https://app.test/verify');
    expect(box.body?.Text).toContain('https://app.test/verify');
  });

  it('accepts a bare sender address', async () => {
    const box = capture();

    await new MailpitEmailSender({
      url: 'http://mailpit.test:8025/',
      from: 'noreply@example.test',
    }).send(verify);

    expect(box.body?.From).toEqual({ Name: '', Email: 'noreply@example.test' });
  });

  it('embeds the ticket QR inline, as base64', async () => {
    const box = capture();

    await sender().send(confirmed);

    const qr = box.body?.Attachments?.[0];
    expect(qr).toMatchObject({
      Filename: 'ticket-qr.png',
      ContentType: 'image/png',
      ContentID: 'ticket-qr',
    });
    expect(
      Buffer.from(qr?.Content ?? '', 'base64')
        .subarray(1, 4)
        .toString(),
    ).toBe('PNG');
  });

  it('throws when Mailpit rejects the email, without the recipient in the error', async () => {
    server.use(
      http.post(SEND_URL, () =>
        HttpResponse.json({ Error: 'invalid To address: runner@example.test' }, { status: 400 }),
      ),
    );

    const sending = sender().send(verify);

    await expect(sending).rejects.toThrow(/Mailpit rejected the email: 400/);
    await expect(sending).rejects.not.toThrow(/runner@example\.test/);
  });
});
