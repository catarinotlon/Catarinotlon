import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

/**
 * The validated application environment.
 *
 * @remarks
 * This is the only module that reads `process.env` for the app. A missing
 * required value fails the build. Set `SKIP_ENV_VALIDATION=1` only for tooling
 * that does not run the app, such as linting.
 */
export const env = createEnv({
  server: {
    TURSO_DATABASE_URL: z.string().min(1),
    TURSO_AUTH_TOKEN: z.string().min(1).optional(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    ADMIN_EMAILS: z.string().default(''),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    EMAIL_TRANSPORT: z.enum(['resend', 'memory', 'mailpit']).default('resend'),
    MAILPIT_URL: z.url().default('http://localhost:8025'),
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(1).optional(),
    CRON_SECRET: z.string().min(16).optional(),
    SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
    SENTRY_ORG: z.string().min(1).optional(),
    SENTRY_PROJECT: z.string().min(1).optional(),
    BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
    RECEIPT_STORAGE: z.enum(['blob', 'memory']).default('blob'),
    RECEIPT_LOCAL_DIR: z.string().min(1).default('.data/receipts'),
    RECEIPT_MAX_BYTES: z.coerce.number().int().positive().default(5_242_880),
  },
  client: {
    NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  },
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === '1',
});

/** Whether the app runs as a production build. */
export const isProduction = process.env.NODE_ENV === 'production';
