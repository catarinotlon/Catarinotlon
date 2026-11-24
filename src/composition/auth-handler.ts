import 'server-only';

import { toNextJsHandler } from 'better-auth/next-js';

import { auth } from '@/shared/infrastructure/auth/instance';

/** The Better Auth route handlers. */
export const authHandlers = toNextJsHandler(auth);
