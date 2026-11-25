'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { useRouter } from '@/i18n/navigation';
import { cn } from '@/shared/ui/cn';

import { ReceiptReceivedScreen, type ScreenPoint } from './receipt-received-screen';
import { ReceiptUploadForm, type ReceiptUploadFormProps } from './receipt-upload-form';

const DEFAULT_SETTLE_MS = 4800;

/** Props of {@link ReceiptSubmission}. */
export interface ReceiptSubmissionProps extends Omit<ReceiptUploadFormProps, 'onDone'> {
  /** Where to go once the receipt is in: open the account, or reload the current page. */
  next: 'account' | 'refresh';
  /** Shown above the form. */
  before?: ReactNode;
  /** Shown below the form. */
  after?: ReactNode;
  /** Classes for the box around the form, such as a dashed frame. */
  className?: string;
  /** How long the confirmation shows before moving on, in milliseconds. */
  settleAfterMs?: number;
}

/**
 * The receipt upload, followed by the full-screen red confirmation once it is recorded.
 *
 * @remarks
 * The red grows from the bottom of the upload box, where the submit button is. After a
 * pause, or at once with "Continue" or Escape, it opens the account (from the payment
 * page) or reloads the page in place (on the account page), where the in-review panel
 * takes over. A refused upload keeps the form and its error.
 *
 * @param props - The upload form's props, where to go next, and what surrounds the form.
 * @returns The upload box, and the confirmation when the receipt is in.
 */
export function ReceiptSubmission({
  next,
  before,
  after,
  className,
  settleAfterMs = DEFAULT_SETTLE_MS,
  ...form
}: ReceiptSubmissionProps) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const left = useRef(false);
  const [received, setReceived] = useState<{ origin?: ScreenPoint } | null>(null);
  const [leaving, setLeaving] = useState(false);

  const moveOn = useCallback(() => {
    if (left.current) return;
    left.current = true;
    setLeaving(true);
    if (next === 'account') router.push('/account');
    else router.refresh();
  }, [next, router]);

  useEffect(() => {
    if (!received) return;
    const timer = setTimeout(moveOn, settleAfterMs);
    return () => clearTimeout(timer);
  }, [received, moveOn, settleAfterMs]);

  function showReceived() {
    const rect = box.current?.getBoundingClientRect();
    setReceived(rect ? { origin: { x: rect.left + rect.width / 2, y: rect.bottom - 32 } } : {});
  }

  return (
    <div ref={box} className={cn('flex flex-col gap-3', className)}>
      {before}
      <ReceiptUploadForm {...form} onDone={showReceived} />
      {after}
      {received && <ReceiptReceivedScreen {...received} leaving={leaving} onContinue={moveOn} />}
    </div>
  );
}
