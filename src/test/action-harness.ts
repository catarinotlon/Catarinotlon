import { createClient, type InValue } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

/** The simulated request the mocked Next.js APIs read from. */
export const requestContext = {
  cookies: new Map<string, string>(),
  locale: 'es' as 'es' | 'en',
  revalidated: [] as string[],
};

/** Forgets the current session and locale, as a new browser would. */
export function resetRequest(): void {
  requestContext.cookies.clear();
  requestContext.locale = 'es';
  requestContext.revalidated.length = 0;
}

const client = () => createClient({ url: process.env.TURSO_DATABASE_URL ?? '' });

/** Applies every migration to this test file's database. */
export async function migrateActionDatabase(): Promise<void> {
  const connection = client();
  await migrate(drizzle(connection), { migrationsFolder: 'drizzle' });
  connection.close();
}

/**
 * Runs raw SQL against the database the real container uses.
 *
 * @param query - The statement.
 * @param args - Its arguments.
 * @returns The rows.
 */
export async function sql(query: string, args: InValue[] = []): Promise<Record<string, unknown>[]> {
  const connection = client();
  try {
    const result = await connection.execute({ sql: query, args });
    return result.rows.map((row) => ({ ...row }));
  } finally {
    connection.close();
  }
}

/** Builds a submitted form. */
export function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

/**
 * Runs an action that should redirect.
 *
 * @param action - The action.
 * @returns The redirect's target path.
 * @throws The action's result or error when it does not redirect.
 */
export async function redirectOf(action: () => Promise<unknown>): Promise<string> {
  let outcome: unknown;
  try {
    outcome = await action();
  } catch (error) {
    const digest = (error as { digest?: unknown }).digest;
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
      return digest.split(';')[2] ?? '';
    }
    throw error;
  }
  throw new Error(`Expected a redirect, got ${JSON.stringify(outcome)}`);
}

/** Obviously fake settings, for this throwaway database only. */
export const OPEN_SETTINGS = {
  eventDate: '2030-01-15',
  startTimes: { '3K': '07:00', '5K': '07:30' },
  venue: { es: 'SEDE DE PRUEBA', en: 'TEST VENUE' },
  kitPickup: { es: 'ENTREGA DE PRUEBA', en: 'TEST PICKUP' },
  routeMapUrl: 'https://example.test/route',
  feeCents: 10000,
  shirtSizes: ['TEST-S', 'TEST-M'],
  shirtSizeDeadline: '2099-01-01T00:00:00.000Z',
  contact: null,
  bank: { beneficiary: 'BENEFICIARIO', bank: 'BANCO', clabe: '002010077777777771' },
};

/** Settings with nothing configured. */
export const CLOSED_SETTINGS = {
  ...OPEN_SETTINGS,
  feeCents: null,
  shirtSizes: [],
  bank: null,
};

let settingsVersion = 0;

/**
 * Appends a settings version, which becomes current.
 *
 * @param values - The settings.
 */
export async function setSettings(values: object): Promise<void> {
  settingsVersion += 1;
  await sql(
    `INSERT INTO event_settings_versions (id, "values", changed_fields, changed_by, created_at)
     VALUES (?, ?, '[]', 'test', ?)`,
    [`settings-${settingsVersion}`, JSON.stringify(values), Date.now() + settingsVersion],
  );
}
