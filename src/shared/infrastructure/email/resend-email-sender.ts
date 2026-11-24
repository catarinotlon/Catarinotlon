import { Resend } from 'resend';

import type { EmailMessage, EmailSender } from '@/shared/domain/email';

import type { EmailEventContext } from './email-content';
import { renderEmail } from './render-email';

/** Options of {@link ResendEmailSender}. */
export interface ResendEmailSenderOptions {
  /** The Resend API key. */
  readonly apiKey: string;
  /** The sender, as `Name <address>`. */
  readonly from: string;
  /** Reads the current event facts for the templates. */
  readonly context?: () => Promise<EmailEventContext>;
}

/** {@link EmailSender} adapter backed by Resend. */
export class ResendEmailSender implements EmailSender {
  private readonly client: Resend;

  /**
   * Creates the sender.
   *
   * @param options - The API key and the sender address.
   */
  constructor(private readonly options: ResendEmailSenderOptions) {
    this.client = new Resend(options.apiKey);
  }

  /**
   * Renders and sends an email.
   *
   * @param message - The email.
   * @throws {Error} When Resend rejects it. The error carries only the provider's
   * error name, because its message may contain the recipient's address.
   */
  async send(message: EmailMessage): Promise<void> {
    const email = await renderEmail(message, await this.options.context?.());

    const { error } = await this.client.emails.send(
      {
        from: this.options.from,
        to: message.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        attachments: email.attachments.map((file) => ({
          filename: file.filename,
          content: file.content,
          contentId: file.contentId,
          contentType: file.contentType,
        })),
      },
      { idempotencyKey: message.idempotencyKey },
    );

    if (error) throw new Error(`Resend rejected the email: ${error.name}`);
  }
}
