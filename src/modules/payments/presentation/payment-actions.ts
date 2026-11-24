'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';

import {
  appClock,
  getSignedInUser,
  receiptMaxBytes,
  receiptStorage,
  replaceAccountReceipt,
  submitAccountReceipt,
} from '@/composition';
import { redirect } from '@/i18n/navigation';
import type { FormState } from '@/shared/ui/form-state';

import { checkReceiptUpload, isOwnReceiptPath } from '../domain/receipt-policy';
import type { ReceiptFile } from '../domain/payment';

const paymentError = (code: string): FormState => ({
  formError: `payment.errors.${code.replace('payments.', '')}`,
});

/**
 * Builds the receipt record from what the store holds, never from the browser.
 *
 * @param pathname - The path the browser says it uploaded to.
 * @param userId - The signed-in user.
 * @returns The verified receipt, or the form error.
 */
async function verifiedReceipt(
  pathname: string,
  userId: string,
): Promise<{ receipt: ReceiptFile } | { failure: FormState }> {
  if (!isOwnReceiptPath(pathname, userId)) return { failure: paymentError('not_found') };

  const stored = await receiptStorage.stat(pathname);
  if (!stored) return { failure: paymentError('upload_failed') };

  const check = checkReceiptUpload(stored, receiptMaxBytes);
  if (!check.ok) return { failure: paymentError(check.error.code) };

  return {
    receipt: {
      pathname,
      contentType: stored.contentType,
      sizeBytes: stored.sizeBytes,
      uploadedAt: appClock.now(),
    },
  };
}

/**
 * Records an uploaded receipt, covering the account's unpaid runners.
 *
 * @param input - The path the file was uploaded to.
 * @returns An error. On success it redirects to the account.
 */
export async function recordReceiptAction(input: { pathname: string }): Promise<FormState> {
  const locale = await getLocale();
  const user = await getSignedInUser();
  if (!user.ok) return redirect({ href: '/sign-in', locale });

  const verified = await verifiedReceipt(input.pathname, user.value.id);
  if ('failure' in verified) return verified.failure;

  const result = await submitAccountReceipt({
    ownerId: user.value.id,
    receipt: verified.receipt,
  });
  if (!result.ok) return paymentError(result.error.code);

  revalidatePath('/[locale]/account', 'page');
  return redirect({ href: '/account', locale });
}

/**
 * Replaces the receipt of a payment under review. The old file is kept.
 *
 * @param input - The new file's path and the payment.
 * @returns The done state, or an error.
 */
export async function replaceReceiptAction(input: {
  pathname: string;
  paymentId: string;
}): Promise<FormState> {
  const locale = await getLocale();
  const user = await getSignedInUser();
  if (!user.ok) return redirect({ href: '/sign-in', locale });

  const verified = await verifiedReceipt(input.pathname, user.value.id);
  if ('failure' in verified) return verified.failure;

  const result = await replaceAccountReceipt({
    userId: user.value.id,
    paymentId: input.paymentId,
    receipt: verified.receipt,
  });
  if (!result.ok) return paymentError(result.error.code);

  revalidatePath('/[locale]/account', 'page');
  return { done: true };
}
