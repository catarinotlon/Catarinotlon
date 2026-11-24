import 'server-only';

import { after } from 'next/server';

import { InMemoryEmailSender, type EmailSender } from '@/shared/domain/email';

import { db } from '../db/client';
import { readEmailContext } from '../email/email-context';
import { ResendEmailSender } from '../email/resend-email-sender';
import { env } from '../env';
import { SentryErrorReporter } from '../sentry-error-reporter';
import { createAuth } from './create-auth';

function createEmailSender(): EmailSender {
  if (env.EMAIL_TRANSPORT === 'memory') return new InMemoryEmailSender();
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    throw new Error('RESEND_API_KEY and EMAIL_FROM are required when EMAIL_TRANSPORT is resend');
  }
  return new ResendEmailSender({
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM,
    context: () => readEmailContext(db),
  });
}

/** The app's email sender. */
export const emailSender = createEmailSender();

/** The app's error reporter. */
export const errorReporter = new SentryErrorReporter();

/** The app's Better Auth instance. */
export const auth = createAuth({
  db,
  emails: emailSender,
  reporter: errorReporter,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
  defer: (task) => after(task),
});
