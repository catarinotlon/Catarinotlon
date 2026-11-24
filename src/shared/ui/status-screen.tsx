'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Link } from '@/i18n/navigation';

import { Button, buttonClasses } from './button';
import { IconBadge } from './status-pill';

const TEXT_LINK =
  'inline-flex min-h-11 items-center justify-center font-semibold underline underline-offset-4';

function RouteMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 92 64" className="h-20 w-auto">
      <path
        d="M4 60C8 22 28 6 46 6s38 16 42 54"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="0.1 8"
      />
      <path
        d="M46 2a17 17 0 0 0-17 17c0 13 17 31 17 31s17-18 17-31A17 17 0 0 0 46 2Z"
        fill="var(--primary)"
      />
      <circle cx="46" cy="19" r="9" fill="var(--ink)" />
      <path d="M46 10v18" stroke="var(--primary)" strokeWidth="1.5" />
      <circle cx="42" cy="16" r="1.6" fill="var(--primary)" />
      <circle cx="50" cy="16" r="1.6" fill="var(--primary)" />
      <circle cx="42" cy="23" r="1.6" fill="var(--primary)" />
      <circle cx="50" cy="23" r="1.6" fill="var(--primary)" />
    </svg>
  );
}

function Frame({
  mark,
  title,
  body,
  children,
}: {
  mark: ReactNode;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-5 rounded-3xl border border-border bg-surface p-6 md:p-10">
      {mark}
      <h1 className="m-0 font-heading text-[clamp(32px,8.5vw,44px)]">{title}</h1>
      <p className="m-0 text-muted-foreground">{body}</p>
      <div className="flex w-full flex-col gap-3">{children}</div>
    </div>
  );
}

/**
 * The friendly error screen, with a retry.
 *
 * @param props - The retry callback.
 * @returns The screen.
 */
export function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations('status');
  return (
    <Frame
      mark={<IconBadge icon="alert" tone="inverse" />}
      title={t('errorTitle')}
      body={t('errorBody')}
    >
      <Button variant="cta" fullWidth onClick={onRetry}>
        {t('retry')}
      </Button>
      <Link href="/" className={TEXT_LINK}>
        {t('home')}
      </Link>
    </Frame>
  );
}

/**
 * The 404 screen.
 *
 * @returns The screen.
 */
export function NotFoundScreen() {
  const t = useTranslations('status');
  return (
    <Frame
      mark={
        <span aria-hidden="true" className="flex items-end gap-3 font-heading text-[120px]">
          4<RouteMark />4
        </span>
      }
      title={t('notFoundTitle')}
      body={t('notFoundBody')}
    >
      <Link href="/" className={buttonClasses({ variant: 'cta', fullWidth: true })}>
        {t('backHome')}
      </Link>
      <Link href="/account" className={TEXT_LINK}>
        {t('toAccount')}
      </Link>
    </Frame>
  );
}
