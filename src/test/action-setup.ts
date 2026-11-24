import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { vi } from 'vitest';

const directory = mkdtempSync(join(tmpdir(), 'catarinotlon-actions-'));

Object.assign(process.env, {
  TURSO_DATABASE_URL: `file:${join(directory, 'actions.db')}`,
  BETTER_AUTH_SECRET: 'action-test-secret-action-test-secret',
  BETTER_AUTH_URL: 'http://localhost:3000',
  ADMIN_EMAILS: 'admin@actions.test',
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  EMAIL_TRANSPORT: 'memory',
  RECEIPT_STORAGE: 'memory',
  RECEIPT_LOCAL_DIR: join(directory, 'receipts'),
  RECEIPT_MAX_BYTES: '1000',
  CRON_SECRET: 'cron-test-secret-value',
});

vi.mock('next/headers', async () => {
  const { requestContext } = await import('./action-harness');
  const store = {
    get: (name: string) => {
      const value = requestContext.cookies.get(name);
      return value === undefined ? undefined : { name, value };
    },
    getAll: () => [...requestContext.cookies].map(([name, value]) => ({ name, value })),
    has: (name: string) => requestContext.cookies.has(name),
    set: (name: string | { name: string; value: string }, value?: string) => {
      if (typeof name === 'string') requestContext.cookies.set(name, value ?? '');
      else requestContext.cookies.set(name.name, name.value);
    },
    delete: (name: string) => requestContext.cookies.delete(name),
  };
  return {
    cookies: async () => store,
    headers: async () =>
      new Headers({
        origin: 'http://localhost:3000',
        cookie: [...requestContext.cookies].map(([key, value]) => `${key}=${value}`).join('; '),
      }),
  };
});

vi.mock('next/cache', async () => {
  const { requestContext } = await import('./action-harness');
  return {
    revalidatePath: (path: string, type?: string) => {
      requestContext.revalidated.push(type ? `${path}:${type}` : path);
    },
  };
});

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (task: () => Promise<void>) => void task(),
}));

vi.mock('next-intl/server', async () => {
  const { requestContext } = await import('./action-harness');
  const { createTranslator } = await import('next-intl');
  const messages = {
    es: (await import('../../messages/es.json')).default,
    en: (await import('../../messages/en.json')).default,
  };
  return {
    getLocale: async () => requestContext.locale,
    getTranslations: async ({ locale, namespace }: { locale: 'es' | 'en'; namespace: string }) =>
      createTranslator({ locale, messages: messages[locale], namespace: namespace as never }),
  };
});
