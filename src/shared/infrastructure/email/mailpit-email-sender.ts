import type { EmailMessage, EmailSender } from '@/shared/domain/email';

import type { EmailEventContext } from './email-content';
import { renderEmail } from './render-email';

/** Options of {@link MailpitEmailSender}. */
export interface MailpitEmailSenderOptions {
  /** Mailpit's web address, such as `http://localhost:8025`. */
  readonly url: string;
  /** The sender, as `Name <address>` or a bare address. */
  readonly from: string;
  /** Reads the current event facts for the templates. */
  readonly context?: () => Promise<EmailEventContext>;
}

function parseAddress(from: string): { Name: string; Email: string } {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from);
  return match ? { Name: match[1] ?? '', Email: match[2] ?? '' } : { Name: '', Email: from.trim() };
}

/**
 * {@link EmailSender} adapter that delivers to a local Mailpit inbox, for
 * development only.
 *
 * @remarks
 * Uses Mailpit's HTTP send API, so no SMTP client is needed. The email is
 * rendered exactly as for Resend, with the ticket QR as an inline image, so the
 * Mailpit inbox shows what a runner would get. Mailpit has no idempotency, so
 * the key travels as an `X-Idempotency-Key` header for inspection.
 */
export class MailpitEmailSender implements EmailSender {
  /**
   * Creates the sender.
   *
   * @param options - Mailpit's address and the sender address.
   */
  constructor(private readonly options: MailpitEmailSenderOptions) {}

  /**
   * Renders and delivers an email to Mailpit.
   *
   * @param message - The email.
   * @throws {Error} When Mailpit rejects it. The error carries only the HTTP
   * status, because Mailpit's message may contain the recipient's address.
   */
  async send(message: EmailMessage): Promise<void> {
    const email = await renderEmail(message, await this.options.context?.());

    const response = await fetch(new URL('api/v1/send', this.withSlash(this.options.url)), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        From: parseAddress(this.options.from),
        To: [{ Email: message.to }],
        Subject: email.subject,
        HTML: email.html,
        Text: email.text,
        Attachments: email.attachments.map((file) => ({
          Content: file.content.toString('base64'),
          Filename: file.filename,
          ContentType: file.contentType,
          ContentID: file.contentId,
        })),
        Headers: { 'X-Idempotency-Key': message.idempotencyKey },
      }),
    });

    if (!response.ok) throw new Error(`Mailpit rejected the email: ${response.status}`);
  }

  private withSlash(url: string): string {
    return url.endsWith('/') ? url : `${url}/`;
  }
}
