import type { ErrorReporter } from './error-reporter';

/** A runner a payment covers, as an email lists them. */
export interface EmailRunner {
  /** The runner's full name. */
  readonly name: string;
  /** The race distance. */
  readonly distance: string;
}

/** Fields common to every transactional email. */
interface EmailEnvelope {
  /** Recipient address. */
  readonly to: string;
  /** Locale the template renders in. */
  readonly locale: string;
  /** Key that prevents the same email from being sent twice. */
  readonly idempotencyKey: string;
}

/** Every transactional email, with the data its template needs. */
export type EmailMessage = EmailEnvelope &
  (
    | { readonly template: 'verify_email'; readonly data: { name: string; url: string } }
    | { readonly template: 'reset_password'; readonly data: { name: string; url: string } }
    | {
        readonly template: 'registration_confirmed';
        readonly data: {
          runnerName: string;
          distance: string;
          bibNumber: string;
          shirtName: string;
          shirtSize: string;
          ticketId: string;
          /**
           * The account page with this runner selected, where the ticket PDF is
           * downloaded. Absent for a manual registration with no account.
           */
          accountUrl: string | null;
        };
      }
    | {
        readonly template: 'race_reminder';
        readonly data: {
          runnerName: string;
          distance: string;
          bibNumber: string;
          accountUrl: string;
          /** `3` or `1`: how many days before the race this reminder goes out. */
          daysLeft: number;
        };
      }
    | {
        readonly template: 'shirt_name_updated';
        readonly data: { runnerName: string; shirtName: string; accountUrl: string };
      }
    | {
        readonly template: 'receipt_received';
        readonly data: {
          runners: readonly EmailRunner[];
          amountCents: number;
          accountUrl: string;
          uploadedAt: Date;
        };
      }
    | {
        readonly template: 'receipt_rejected';
        readonly data: { reason: string; uploadUrl: string };
      }
    | {
        readonly template: 'admin_new_receipt';
        readonly data: {
          uploaderName: string;
          runners: readonly EmailRunner[];
          amountCents: number;
          concept: string;
          reviewUrl: string;
          uploadedAt: Date;
        };
      }
    | {
        readonly template: 'bank_data_changed';
        readonly data: { changedBy: string; settingsUrl: string };
      }
    | {
        readonly template: 'admin_granted';
        readonly data: { grantedBy: string; signInUrl: string };
      }
  );

/** Sends transactional email. */
export interface EmailSender {
  /**
   * Sends one email.
   *
   * @param message - The template, its data, and the envelope.
   *
   * @example
   * ```ts
   * await emails.send({ template: 'verify_email', to, locale, idempotencyKey, data });
   * ```
   */
  send(message: EmailMessage): Promise<void>;
}

/**
 * Sends an email after its transaction has committed, without failing the caller.
 *
 * @remarks
 * The business change has already happened, so a provider outage must not turn
 * it into an error for the user. The failure goes to the error reporter, with
 * only the template name as context.
 *
 * @param ports - The email sender and the error reporter.
 * @param message - The email to send.
 *
 * @example
 * ```ts
 * await sendAfterCommit({ emails, reporter }, message);
 * ```
 */
export async function sendAfterCommit(
  ports: { readonly emails: EmailSender; readonly reporter: ErrorReporter },
  message: EmailMessage,
): Promise<void> {
  try {
    await ports.emails.send(message);
  } catch (error) {
    ports.reporter.report(error, { operation: 'email.send', template: message.template });
  }
}

/** {@link EmailSender} double that records what was sent. */
export class InMemoryEmailSender implements EmailSender {
  /** Emails sent so far, deduplicated by idempotency key. */
  readonly sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    if (this.sent.some((item) => item.idempotencyKey === message.idempotencyKey)) return;
    this.sent.push(message);
  }
}
