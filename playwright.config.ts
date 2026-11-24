import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

/** Test-only values. E2E never touches remote Turso and never sends real email. */
export const E2E_ENV = {
  TURSO_DATABASE_URL: 'file:e2e/.tmp/e2e.db',
  BETTER_AUTH_SECRET: 'e2e-only-secret-e2e-only-secret-e2e-only',
  BETTER_AUTH_URL: baseURL,
  ADMIN_EMAILS: 'admin@e2e.test',
  GOOGLE_CLIENT_ID: 'e2e-google-client-id',
  GOOGLE_CLIENT_SECRET: 'e2e-google-client-secret',
  EMAIL_TRANSPORT: 'memory',
  RECEIPT_STORAGE: 'memory',
  RECEIPT_LOCAL_DIR: 'e2e/.tmp/receipts',
  NEXT_TELEMETRY_DISABLED: '1',
};

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL,
    locale: 'es-MX',
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], locale: 'es-MX' } },
    { name: 'mobile', use: { ...devices['Pixel 7'], locale: 'es-MX' } },
  ],
  webServer: {
    command: `pnpm exec tsx e2e/support/prepare-database.ts && pnpm build && pnpm start -p ${PORT}`,
    url: `${baseURL}/es`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: E2E_ENV,
  },
});
