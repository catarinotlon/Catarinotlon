import QRCode from 'qrcode';
import { render } from 'react-email';

import type { EmailMessage } from '@/shared/domain/email';

import { buildEmailContent, EMPTY_EMAIL_CONTEXT, type EmailEventContext } from './email-content';
import { QR_CONTENT_ID, TransactionalEmail } from './transactional-email';

/** An image embedded in an email and referenced by its content ID. */
export interface InlineAttachment {
  /** The file name. */
  filename: string;
  /** The content ID used in `cid:` image sources. */
  contentId: string;
  /** The file's MIME type. */
  contentType: string;
  /** The file's bytes. */
  content: Buffer;
}

/** A transactional email ready to send. */
export interface RenderedEmail {
  /** The subject line. */
  subject: string;
  /** The HTML body. */
  html: string;
  /** The plain-text body. */
  text: string;
  /** Inline images. Receipts are never attached. */
  attachments: InlineAttachment[];
}

/**
 * Renders a transactional email in the recipient's locale.
 *
 * @remarks
 * Message values are escaped by React. The ticket QR encodes only the ticket's
 * UUID and travels as an inline image, because many clients block data URLs.
 *
 * @param message - The email to render.
 * @param context - The current event facts.
 * @returns The subject, the HTML and text bodies, and any inline images.
 *
 * @example
 * ```ts
 * const { subject, html, text } = await renderEmail(message);
 * ```
 */
export async function renderEmail(
  message: EmailMessage,
  context: EmailEventContext = EMPTY_EMAIL_CONTEXT,
): Promise<RenderedEmail> {
  const content = buildEmailContent(message, context);
  const document = <TransactionalEmail locale={message.locale} content={content} />;

  const attachments: InlineAttachment[] =
    message.template === 'registration_confirmed'
      ? [
          {
            filename: 'ticket-qr.png',
            contentId: QR_CONTENT_ID,
            contentType: 'image/png',
            content: await QRCode.toBuffer(message.data.ticketId, { margin: 1, width: 360 }),
          },
        ]
      : [];

  return {
    subject: content.subject,
    html: await render(document),
    text: await render(document, { plainText: true }),
    attachments,
  };
}
