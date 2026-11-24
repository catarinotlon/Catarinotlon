import { z } from 'zod';

const databaseEnvSchema = z.object({
  TURSO_DATABASE_URL: z.string().min(1).default('file:local.db'),
  TURSO_AUTH_TOKEN: z.string().min(1).optional(),
});

/** Connection settings for the database. */
export interface DatabaseEnv {
  /** The libSQL URL. */
  readonly url: string;
  /** The auth token, absent for local files. */
  readonly authToken?: string;
}

/**
 * Reads the database connection settings.
 *
 * @remarks
 * This is separate from the full app environment so database tooling can run
 * without the other secrets. Local development defaults to `file:local.db`.
 *
 * @param source - The environment to read.
 * @returns The connection settings.
 * @throws {z.ZodError} When a value is present but invalid.
 */
export function readDatabaseEnv(
  source: Readonly<Record<string, string | undefined>> = process.env,
): DatabaseEnv {
  const { TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: authToken } = databaseEnvSchema.parse(source);
  return authToken ? { url, authToken } : { url };
}
