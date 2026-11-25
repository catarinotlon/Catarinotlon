'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import { FormAlert } from '@/shared/ui/form-fields';
import type { FormState } from '@/shared/ui/form-state';
import { MorphButton } from '@/shared/ui/morph-button';

import {
  checkReceiptUpload,
  RECEIPT_CONTENT_TYPES,
  receiptPathPrefix,
} from '../domain/receipt-policy';

const DEFAULT_MAX_BYTES = 5_242_880;
const MORPH_REST_MS = 2400;
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
  /**
   * Turns the submit button into a {@link MorphButton}: it shrinks into a spinning
   * circle while sending, fills in with a check when done, and the form then shows this
   * confirmation and forgets the file, ready for another one.
   */
  doneLabel?: string;
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
  doneLabel,
}: ReceiptUploadFormProps) {
  const t = useTranslations('payment');
  const root = useTranslations();
  const inputId = useId();
  const helpId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [justDone, setJustDone] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!justDone) return;
    const timer = setTimeout(() => setJustDone(false), MORPH_REST_MS);
    return () => clearTimeout(timer);
  }, [justDone]);

  function finish() {
    if (doneLabel) {
      setFile(null);
      if (input.current) input.current.value = '';
      setJustDone(true);
      setConfirmed(true);
    }
    onDone?.();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setConfirmed(false);

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
      else if (state.done) finish();
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
          ref={input}
          aria-describedby={helpId}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setConfirmed(false);
          }}
          className="min-h-11 w-full rounded-lg border-2 border-input-border bg-input p-1 text-foreground file:mr-3 file:min-h-9 file:rounded-md file:border-0 file:bg-inverse file:px-3 file:font-semibold file:text-inverse-foreground"
        />
        <p id={helpId} className="m-0 text-sm text-muted-foreground">
          {file ? t('receiptReady', { name: file.name }) : t('receiptHelp')}
        </p>
      </div>
      {doneLabel ? (
        <>
          <MorphButton
            type="submit"
            state={pending ? 'pending' : justDone ? 'done' : 'idle'}
            pendingLabel={t('sending')}
            doneLabel={doneLabel}
          >
            {submitLabel}
          </MorphButton>
          {confirmed && (
            <p
              role="status"
              className="m-0 flex items-center justify-center gap-2 font-semibold motion-safe:animate-rise-in motion-safe:[animation-delay:0.2s]"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0">
                <circle cx="12" cy="12" r="11" className="fill-inverse" />
                <path
                  d="M7 12.5l3.2 3.2L17 9"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="fill-none stroke-inverse-foreground"
                />
              </svg>
              {doneLabel}
            </p>
          )}
        </>
      ) : (
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
      )}
    </form>
  );
}
