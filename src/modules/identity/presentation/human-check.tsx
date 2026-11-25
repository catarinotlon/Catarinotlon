'use client';

import { useLocale } from 'next-intl';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string | undefined;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
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
 * @param props - The site key and the reset signal.
 * @returns The widget's container, or nothing when the check is off.
 */
export function HumanCheck({ siteKey, resetSignal }: HumanCheckProps) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [interactive, setInteractive] = useState(false);
  const locale = useLocale();
  const { resolvedTheme, forcedTheme } = useTheme();
  const theme = (forcedTheme ?? resolvedTheme) === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
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
    if (resetSignal !== undefined && widget.current) window.turnstile?.reset(widget.current);
  }, [resetSignal]);

  if (!siteKey) return null;
  return <div ref={container} data-human-check className={interactive ? 'mb-4' : undefined} />;
}
