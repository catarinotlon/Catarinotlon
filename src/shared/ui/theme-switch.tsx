'use client';

import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useSyncExternalStore, type ReactNode } from 'react';

import { cn } from './cn';
import { SegmentedControl } from './segmented-control';

const subscribe = () => () => undefined;

const MOON = <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />;
const SUN = (
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>
);

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** Props of {@link ThemeSwitch}. */
export interface ThemeSwitchProps {
  /**
   * `icon`: one button that names the switch it makes, for the header. `segmented`: the
   * light and dark themes as two choices, for the phone menu.
   */
  variant?: 'icon' | 'segmented';
}

/**
 * Switches between the light and dark themes.
 *
 * @remarks
 * This is the only place that calls `setTheme`. The active theme is unknown on
 * the server, so a same-size placeholder renders until the client has mounted. The moon
 * and the sun cross-fade and turn when the theme changes, unless the visitor prefers
 * reduced motion. The segmented variant offers both themes as radio choices instead.
 *
 * @param props - The look.
 * @returns The theme switch.
 */
export function ThemeSwitch({ variant = 'icon' }: ThemeSwitchProps) {
  const t = useTranslations('theme');
  const { forcedTheme, resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const segmented = variant === 'segmented';

  if (!mounted) {
    return (
      <span
        aria-hidden="true"
        className={cn('inline-block', segmented ? 'h-11 w-[100px]' : 'size-11')}
      />
    );
  }

  const isDark = (forcedTheme ?? resolvedTheme) === 'dark';

  if (segmented) {
    return (
      <SegmentedControl
        variant="compact"
        name="theme"
        legend={t('label')}
        legendClassName="sr-only"
        value={isDark ? 'dark' : 'light'}
        onChange={(value) => setTheme(value)}
        options={[
          {
            value: 'light',
            label: (
              <>
                <Icon>{SUN}</Icon>
                <span className="sr-only">{t('light')}</span>
              </>
            ),
          },
          {
            value: 'dark',
            label: (
              <>
                <Icon>{MOON}</Icon>
                <span className="sr-only">{t('dark')}</span>
              </>
            ),
          },
        ]}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={isDark ? t('toLight') : t('toDark')}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-foreground hover:bg-muted"
    >
      <span aria-hidden="true" className="relative size-5">
        <svg
          data-icon="moon"
          viewBox="0 0 24 24"
          className={cn(
            'absolute inset-0 size-5 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none',
            isDark ? 'scale-50 -rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100',
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {MOON}
        </svg>
        <svg
          data-icon="sun"
          viewBox="0 0 24 24"
          className={cn(
            'absolute inset-0 size-5 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none',
            isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-50 rotate-90 opacity-0',
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {SUN}
        </svg>
      </span>
    </button>
  );
}
