import { beforeEach, describe, expect, it } from 'vitest';

import { createPaymentsKit } from './payments-test-kit';
import { registerManually, type RegisterManuallyInput } from './register-manually';

const input: RegisterManuallyInput = {
  adminId: 'admin-1',
  runnerName: 'Walk In',
  distance: '3K',
  shirtSize: 'size-a',
  shirtName: 'WALK',
  locale: 'es',
  contactEmail: 'walkin@example.test',
  contactPhone: '5500000000',
  paymentReceived: false,
};

describe('registerManually', () => {
  let kit: ReturnType<typeof createPaymentsKit>;

  const deps = (
    settings: { feeCents: number; shirtSizes: string[] } | null = {
      feeCents: 10000,
      shirtSizes: ['size-a'],
    },
  ) => ({
    ...kit,
    settings: { read: async () => settings },
    random: { next: () => 0.5 },
  });

  beforeEach(() => {
    kit = createPaymentsKit();
  });

  it('creates a registration with no account', async () => {
    const result = await registerManually(deps(), input);

    expect(result.ok && result.value.registration).toMatchObject({
      ownerId: null,
      contactEmail: 'walkin@example.test',
      contactPhone: '5500000000',
    });
  });

  it('stays pending when the payment was not received', async () => {
    const result = await registerManually(deps(), input);

    expect(result.ok && result.value.registration.status).toBe('pending_payment');
    expect(result.ok && result.value.ticket).toBeNull();
    expect(kit.emails.sent).toEqual([]);
  });

  it('confirms at once and issues a ticket when the payment was received', async () => {
    const result = await registerManually(deps(), { ...input, paymentReceived: true });

    if (!result.ok) throw new Error('expected success');
    expect((await kit.registrations.findById(result.value.registration.id))?.status).toBe(
      'confirmed',
    );
    expect((await kit.tickets.findByRegistration(result.value.registration.id))?.id).toBe(
      result.value.ticket?.id,
    );
  });

  it('emails the ticket summary, with no PDF link, to the contact address', async () => {
    await registerManually(deps(), { ...input, paymentReceived: true });

    expect(kit.emails.sent).toMatchObject([
      {
        template: 'registration_confirmed',
        to: 'walkin@example.test',
        data: { runnerName: 'Walk In', shirtSize: 'size-a', ticketPdfUrl: null, accountUrl: null },
      },
    ]);
  });

  it('sends nothing when there is no contact address', async () => {
    await registerManually(deps(), { ...input, contactEmail: '  ', paymentReceived: true });

    expect(kit.emails.sent).toEqual([]);
  });

  it('propagates validation errors', async () => {
    const result = await registerManually(deps(), { ...input, shirtName: ' ' });

    expect(result).toEqual({ ok: false, error: { code: 'registration.shirt_name_required' } });
  });

  it('is closed while the fee is not configured', async () => {
    const result = await registerManually(deps(null), input);

    expect(result).toEqual({ ok: false, error: { code: 'registration.not_open' } });
  });
});
