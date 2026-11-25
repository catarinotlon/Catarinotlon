'use client';

import { useTranslations } from 'next-intl';

import type { FormState } from '@/shared/ui/form-state';

import { ReceiptUploadForm } from './receipt-upload-form';

/** Props of {@link ReplaceReceiptForm}. */
export interface ReplaceReceiptFormProps {
  /** The payment whose receipt is replaced. */
  paymentId: string;
  /** Which store receives the file. */
  mode: 'blob' | 'local';
  /** The signed-in user. */
  userId: string;
  /** Records the new file. */
  action: (input: { pathname: string; paymentId: string }) => Promise<FormState>;
  /** Replaces the default upload, for tests and stories. */
  uploader?: (file: File) => Promise<{ pathname: string }>;
}

/**
 * Replaces the receipt of a payment that is still under review.
 *
 * @remarks
 * Its button turns into a circle while sending and fills in with a check once the
 * new file is recorded; the form then confirms the replacement and forgets the file.
 *
 * @param props - The payment, the upload mode, the user, and the action.
 * @returns The form.
 */
export function ReplaceReceiptForm({
  paymentId,
  mode,
  userId,
  action,
  uploader,
}: ReplaceReceiptFormProps) {
  const t = useTranslations('account');

  return (
    <ReceiptUploadForm
      mode={mode}
      userId={userId}
      submitLabel={t('replaceReceipt')}
      doneLabel={t('receiptReplaced')}
      {...(uploader ? { uploader } : {})}
      action={({ pathname }) => action({ pathname, paymentId })}
    />
  );
}
