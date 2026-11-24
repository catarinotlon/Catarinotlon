import { randomUUID } from 'node:crypto';

import { createClient, type Client } from '@libsql/client';

/** Obviously fake settings. They exist only in the throwaway E2E database. */
export const TEST_SETTINGS = {
  eventDate: '2030-01-15',
  startTimes: { '3K': '07:00', '5K': '07:30' },
  venue: { es: 'SEDE DE PRUEBA', en: 'TEST VENUE' },
  kitPickup: { es: 'ENTREGA DE PRUEBA', en: 'TEST PICKUP' },
  routeMapUrl: 'https://example.test/route',
  feeCents: 10000,
  shirtSizes: ['TEST-S', 'TEST-M'],
  shirtSizeDeadline: '2030-01-01T00:00:00.000Z',
  contact: {
    fullName: 'CONTACTO DE PRUEBA',
    phone: '0000000000',
    email: 'contact@e2e.test',
    whatsapp: '520000000000',
    hours: { es: 'HORARIO DE PRUEBA', en: 'TEST HOURS' },
  },
  bank: {
    beneficiary: 'BENEFICIARIO DE PRUEBA',
    bank: 'BANCO DE PRUEBA',
    clabe: '002010077777777771',
  },
};

/** Settings with nothing configured. */
export const EMPTY_SETTINGS = {
  eventDate: null,
  startTimes: { '3K': null, '5K': null },
  venue: null,
  kitPickup: null,
  routeMapUrl: null,
  feeCents: null,
  shirtSizes: [],
  shirtSizeDeadline: null,
  contact: null,
  bank: null,
};

async function withClient<T>(work: (client: Client) => Promise<T>): Promise<T> {
  const client = createClient({ url: 'file:e2e/.tmp/e2e.db' });
  try {
    return await work(client);
  } finally {
    client.close();
  }
}

/** Appends a settings version, which becomes current. */
export function setEventSettings(values: object): Promise<void> {
  return withClient(async (client) => {
    await client.execute({
      sql: `INSERT INTO event_settings_versions (id, "values", changed_fields, changed_by, created_at)
            VALUES (?, ?, '[]', 'e2e', ?)`,
      args: [randomUUID(), JSON.stringify(values), Date.now()],
    });
  });
}

/** Marks an account's email as verified, standing in for clicking the link. */
export function verifyEmail(email: string): Promise<void> {
  return withClient(async (client) => {
    await client.execute({
      sql: 'UPDATE user SET email_verified = 1 WHERE email = ?',
      args: [email],
    });
  });
}

/** Lists the registrations of an account. */
export function registrationsOf(
  email: string,
): Promise<
  { runner_name: string; status: string; distance: string; shirt_name: string; fee_cents: number }[]
> {
  return withClient(async (client) => {
    const result = await client.execute({
      sql: `SELECT r.runner_name, r.status, r.distance, r.shirt_name, r.fee_cents
            FROM registrations r JOIN user u ON u.id = r.owner_id
            WHERE u.email = ? ORDER BY r.created_at`,
      args: [email],
    });
    return result.rows as never;
  });
}

/** Lists the legal acceptances of an account. */
export function acceptancesOf(email: string): Promise<unknown[]> {
  return withClient(async (client) => {
    const result = await client.execute({
      sql: `SELECT a.privacy_version FROM legal_acceptances a JOIN user u ON u.id = a.user_id WHERE u.email = ?`,
      args: [email],
    });
    return [...result.rows];
  });
}

/** Builds an email address unique to this run. */
export const uniqueEmail = (prefix: string): string => `${prefix}-${randomUUID()}@e2e.test`;
