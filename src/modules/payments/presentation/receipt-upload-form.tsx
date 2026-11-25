'use client';

import { useTranslations } from 'next-intl';
import { useId, useState, type FormEvent } from 'react';

import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import { FormAlert } from '@/shared/ui/form-fields';
import type { FormState } from '@/shared/ui/form-state';

import {
  checkReceiptUpload,
  RECEIPT_CONTENT_TYPES,
  receiptPathPrefix,
} from '../domain/receipt-policy';

const DEFAULT_MAX_BYTES = 5_242_880;
const UPLOAD_TOKEN_ROUTE = '/api/receipts/upload';
const LOCAL_UPLOAD_ROUTE = '/api/receipts/local';

const extensionOf = (file: File): string => file.name.split('.').pop()?.toLowerCase() ?? 'bin';

async function uploadToStore(
  mode: 'blob' | 'local',
  userId: string,
  file: File,
): Promise<{ pathname: string }> {
  const pathname = `${receiptPathPrefix(userId)}${crypto.randomUUID()}.${extensionOf(file)}`;

  if (mode === 'blob') {
    const { upload } = await import('@vercel/blob/client');
    const blob = await upload(pathname, file, {
      access: 'private',
      handleUploadUrl: UPLOAD_TOKEN_ROUTE,
      contentType: file.type,
    });
    return { pathname: blob.pathname };
  }

  const body = new FormData();
  body.set('file', file);
  body.set('pathname', pathname);
  const response = await fetch(LOCAL_UPLOAD_ROUTE, { method: 'POST', body });
  if (!response.ok) throw new Error('Upload failed');
  return { pathname };
}

const SUBMIT_TONES = {
  primary: { variant: 'cta', className: '' },
  inverse: { variant: 'cta', className: 'bg-inverse text-inverse-foreground' },
  outline: { variant: 'outline', className: 'rounded-full' },
} as const;

/** Props of {@link ReceiptUploadForm}. */
export interface ReceiptUploadFormProps {
  /** Which store receives the file. */
  mode: 'blob' | 'local';
  /** The signed-in user, whose folder receives the file. */
  userId: string;
  /** Records the uploaded file on the server. */
  action: (input: { pathname: string }) => Promise<FormState>;
  /** Replaces the default upload, for tests and stories. */
  uploader?: (file: File) => Promise<{ pathname: string }>;
  /** The submit button's label. */
  submitLabel: string;
  /** The size limit, in bytes. */
  maxBytes?: number;
  /** Draws a dashed area around the file field. */
  dashed?: boolean;
  /** The submit button's look. */
  submitTone?: keyof typeof SUBMIT_TONES;
  /** Called once the server has recorded the receipt. */
  onDone?: () => void;
}

/**
 * Uploads a transfer receipt directly to storage, then records it.
 *
 * @remarks
 * The file never passes through a Server Action, whose request body is capped.
 * The checks here are for quick feedback. The server validates everything again.
 *
 * @param props - The upload mode, the user, and the action.
 * @returns The form.
 */
export function ReceiptUploadForm({
  mode,
  userId,
  action,
  uploader,
  submitLabel,
  maxBytes = DEFAULT_MAX_BYTES,
  submitTone = 'primary',
  dashed = false,
  onDone,
}: ReceiptUploadFormProps) {
  const t = useTranslations('payment');
  const root = useTranslations();
  const inputId = useId();
  const helpId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError('payment.errors.receipt_required');
      return;
    }
    const check = checkReceiptUpload({ contentType: file.type, sizeBytes: file.size }, maxBytes);
    if (!check.ok) {
      setError(`payment.errors.${check.error.code.replace('payments.', '')}`);
      return;
    }

    setPending(true);
    try {
      const { pathname } = await (uploader ?? ((item) => uploadToStore(mode, userId, item)))(file);
      const state = await action({ pathname });
      if (state.formError) setError(state.formError);
      else if (state.done) onDone?.();
    } catch {
      setError('payment.errors.upload_failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      {error && <FormAlert>{root(error as never)}</FormAlert>}
      <label htmlFor={inputId} className="font-semibold">
        {t('receiptLabel')}
      </label>
      <div
        className={cn(
          'flex flex-col gap-1',
          dashed && 'rounded-2xl border-2 border-dashed border-input-border p-4',
        )}
      >
        <input
          id={inputId}
          type="file"
          accept={RECEIPT_CONTENT_TYPES.join(',')}
          aria-describedby={helpId}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="min-h-11 w-full rounded-lg border-2 border-input-border bg-input p-1 text-foreground file:mr-3 file:min-h-9 file:rounded-md file:border-0 file:bg-inverse file:px-3 file:font-semibold file:text-inverse-foreground"
        />
        <p id={helpId} className="m-0 text-sm text-muted-foreground">
          {file ? t('receiptReady', { name: file.name }) : t('receiptHelp')}
        </p>
      </div>
      <Button
        type="submit"
        variant={SUBMIT_TONES[submitTone].variant}
        className={SUBMIT_TONES[submitTone].className}
        fullWidth
        pending={pending}
        pendingLabel={t('sending')}
      >
        {submitLabel}
      </Button>
    </form>
  );
}
