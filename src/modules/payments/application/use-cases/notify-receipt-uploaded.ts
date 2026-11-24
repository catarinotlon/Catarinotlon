import { sendAfterCommit, type EmailRunner, type EmailSender } from '@/shared/domain/email';
import type { ErrorReporter } from '@/shared/domain/error-reporter';

import type { Payment } from '../../domain/payment';
import type { AccountContact, PaymentContacts, PaymentLinks } from '../ports/payment-support';

const ADMIN_LOCALE = 'es';

/**
 * Tells the account holder and every admin that a receipt was uploaded.
 *
 * @remarks
 * Idempotency keys include the file path, so replacing a receipt notifies again.
 * The emails never attach the receipt.
 *
 * @param deps - The email, contact, and link ports.
 * @param payment - The payment holding the new receipt.
 * @param holder - The account holder.
 * @param runners - The runners the payment covers.
 */
export async function notifyReceiptUploaded(
  deps: {
    readonly emails: EmailSender;
    readonly reporter: ErrorReporter;
    readonly contacts: PaymentContacts;
    readonly links: PaymentLinks;
  },
  payment: Payment,
  holder: AccountContact,
  runners: readonly EmailRunner[],
): Promise<void> {
  const fileKey = `${payment.id}:${payment.receipt.pathname}`;

  await sendAfterCommit(deps, {
    template: 'receipt_received',
    to: holder.email,
    locale: holder.locale,
    idempotencyKey: `receipt_received:${fileKey}`,
    data: {
      runners,
      amountCents: payment.amountCents,
      accountUrl: deps.links.account(holder.locale),
      uploadedAt: payment.receipt.uploadedAt,
    },
  });

  for (const adminEmail of await deps.contacts.adminEmails()) {
    await sendAfterCommit(deps, {
      template: 'admin_new_receipt',
      to: adminEmail,
      locale: ADMIN_LOCALE,
      idempotencyKey: `admin_new_receipt:${fileKey}:${adminEmail}`,
      data: {
        uploaderName: holder.name,
        runners,
        amountCents: payment.amountCents,
        concept: payment.concept,
        reviewUrl: deps.links.adminPayment(payment.id, ADMIN_LOCALE),
        uploadedAt: payment.receipt.uploadedAt,
      },
    });
  }
}
