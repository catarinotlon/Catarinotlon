import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { EmailMessage } from '@/shared/domain/email';

import { ResendEmailSender } from './resend-email-sender';

const server = setupServer();

const message: EmailMessage = {
  template: 'verify_email',
  to: 'runner@example.test',
  locale: 'es',
  idempotencyKey: 'verify:user-1',
  data: { name: 'Sofía', url: 'https://app.test/verify' },
};

describe('ResendEmailSender', () => {
  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  const sender = () =>
    new ResendEmailSender({ apiKey: 're_test_key', from: 'Catarinotlón <noreply@example.test>' });

  it('sends the rendered email with its idempotency key', async () => {
    let received: { body: Record<string, unknown>; idempotencyKey: string | null } | undefined;
    server.use(
      http.post('https://api.resend.com/emails', async ({ request }) => {
        received = {
          body: (await request.json()) as Record<string, unknown>,
          idempotencyKey: request.headers.get('Idempotency-Key'),
        };
        return HttpResponse.json({ id: 'email-1' });
      }),
    );

    await sender().send(message);

    expect(received?.idempotencyKey).toBe('verify:user-1');
    expect(received?.body).toMatchObject({
      from: 'Catarinotlón <noreply@example.test>',
      to: 'runner@example.test',
      subject: 'Confirma tu correo para activar tu cuenta',
    });
    expect(received?.body.html).toContain('https://app.test/verify');
  });

  it('throws when the provider rejects the email', async () => {
    server.use(
      http.post('https://api.resend.com/emails', () =>
        HttpResponse.json(
          { statusCode: 422, name: 'validation_error', message: 'Invalid' },
          { status: 422 },
        ),
      ),
    );

    await expect(sender().send(message)).rejects.toThrow(/validation_error/);
  });

  it('does not put the recipient in the error', async () => {
    server.use(
      http.post('https://api.resend.com/emails', () =>
        HttpResponse.json(
          { statusCode: 422, name: 'validation_error', message: 'runner@example.test is bad' },
          { status: 422 },
        ),
      ),
    );

    await expect(sender().send(message)).rejects.not.toThrow(/runner@example\.test/);
  });
});
