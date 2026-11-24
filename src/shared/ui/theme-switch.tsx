'use client';

import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;

/**
 * Switches between the light and dark themes.
 *
 * @remarks
 * This is the only place that calls `setTheme`. The active theme is unknown on
 * the server, so a same-size placeholder renders until the client has mounted.
 *
 * @returns The theme switch.
 */
export function ThemeSwitch() {
  const t = useTranslations('theme');
  const { forcedTheme, resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  if (!mounted) return <span aria-hidden="true" className="inline-block size-11" />;

  const isDark = (forcedTheme ?? resolvedTheme) === 'dark';

  return (
    <button
      type="button"
      aria-label={isDark ? t('toLight') : t('toDark')}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border-2 border-input-border text-foreground hover:bg-muted"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {isDark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        )}
      </svg>
    </button>
  );
}
