'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/shared/ui/button';
import { FormAlert } from '@/shared/ui/form-fields';

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const RESPONSE_FIELD = 'cf-turnstile-response';

interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string | undefined;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
  getResponse(widgetId: string): string | undefined;
  isExpired(widgetId: string): boolean;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile did not load'));
    script.onerror = () => reject(new Error('Turnstile did not load'));
    document.head.append(script);
  }).catch((error: unknown) => {
    loading = undefined;
    throw error;
  });
  return loading;
}

/** A submission held back until Cloudflare hands out a token. */
interface HeldSubmission {
  readonly form: HTMLFormElement;
  readonly submitter: HTMLElement | null;
}

type Status = 'idle' | 'verifying' | 'failed';

/** Props of {@link HumanCheck}. */
export interface HumanCheckProps {
  /** The Turnstile site key. `null` turns the check off and renders nothing. */
  siteKey: string | null;
  /**
   * Changes whenever the server refused the token. Each new value starts a fresh
   * challenge, since a checked token is spent.
   */
  resetSignal?: unknown;
}

/**
 * Cloudflare Turnstile's "are you a person?" check, placed inside a form.
 *
 * @remarks
 * It uses the "interaction-only" appearance: most visitors never see it, and it
 * shows a checkbox only when Cloudflare is unsure. When solved, Turnstile adds a
 * hidden `cf-turnstile-response` field to the form, which the server action checks.
 * Once Cloudflare asks the visitor to interact, the widget gets room above the button.
 * It follows the page's language and theme.
 *
 * The form never reaches the server without a fresh token: a submission made while
 * the challenge is still running, after the token expired (a phone pauses a tab in
 * the background), or after a failure is held, says it is checking, starts a new
 * challenge when needed, and goes out by itself once the token arrives. When
 * Cloudflare cannot finish the challenge or does not support the browser there is no
 * box to tick, so it explains that next to the button and offers to try again.
 *
 * @param props - The site key and the reset signal.
 * @returns The widget's container, or nothing when the check is off.
 */
export function HumanCheck({ siteKey, resetSignal }: HumanCheckProps) {
  const t = useTranslations('humanCheck');
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const held = useRef<HeldSubmission | null>(null);
  const failed = useRef(false);
  const [interactive, setInteractive] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const locale = useLocale();
  const { resolvedTheme, forcedTheme } = useTheme();
  const theme = (forcedTheme ?? resolvedTheme) === 'dark' ? 'dark' : 'light';

  function changeStatus(next: Status) {
    failed.current = next === 'failed';
    setStatus(next);
  }

  function restart() {
    if (widget.current) window.turnstile?.reset(widget.current);
  }

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;

    function onToken(token: string) {
      changeStatus('idle');
      const submission = held.current;
      held.current = null;
      if (!submission) return;
      const field = container.current?.querySelector<HTMLInputElement>(
        `input[name="${RESPONSE_FIELD}"]`,
      );
      if (field) field.value = token;
      submission.form.requestSubmit(submission.submitter);
    }

    function onFailure() {
      held.current = null;
      changeStatus('failed');
      return true;
    }

    loadTurnstile()
      .then((api) => {
        if (cancelled || !container.current) return;
        widget.current =
          api.render(container.current, {
            sitekey: siteKey,
            appearance: 'interaction-only',
            size: 'flexible',
            language: locale,
            theme,
            callback: onToken,
            'error-callback': onFailure,
            'unsupported-callback': onFailure,
            'before-interactive-callback': () => setInteractive(true),
          }) ?? null;
      })
      // A blocked script leaves no token; the server then refuses and explains why.
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey, locale, theme]);

  useEffect(() => {
    const form = container.current?.closest('form');
    if (!siteKey || !form) return;

    function holdUntilVerified(event: SubmitEvent) {
      const api = window.turnstile;
      const id = widget.current;
      if (!api || !id) return;
      if (!failed.current && api.getResponse(id) && !api.isExpired(id)) return;

      event.preventDefault();
      event.stopPropagation();
      if (failed.current || api.isExpired(id)) api.reset(id);
      held.current = { form: event.currentTarget as HTMLFormElement, submitter: event.submitter };
      changeStatus('verifying');
    }

    form.addEventListener('submit', holdUntilVerified, true);
    return () => form.removeEventListener('submit', holdUntilVerified, true);
  }, [siteKey]);

  useEffect(() => {
    if (resetSignal !== undefined && widget.current) window.turnstile?.reset(widget.current);
  }, [resetSignal]);

  if (!siteKey) return null;
  return (
    <>
      <div ref={container} data-human-check className={interactive ? 'mb-4' : undefined} />
      <p role="status" className="mt-0 mb-3 text-sm text-muted-foreground empty:hidden">
        {status === 'verifying' ? t('verifying') : null}
      </p>
      {status === 'failed' && (
        <div className="mb-4 flex flex-col gap-2">
          <FormAlert>{t('failed')}</FormAlert>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              changeStatus('idle');
              restart();
            }}
          >
            {t('retry')}
          </Button>
        </div>
      )}
    </>
  );
}
