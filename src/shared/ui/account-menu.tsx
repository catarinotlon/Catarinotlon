'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { Link } from '@/i18n/navigation';

import { buttonClasses } from './button';
import { cn } from './cn';
import { initials } from './initials';
import { RunnerLinks, type MenuAccount } from './runner-links';
import { SignOutForm } from './sign-out-form';

/** Props of {@link AccountMenu}. */
export interface AccountMenuProps {
  /** The signed-in account: the holder's name, the runners, and what is payable. */
  account: MenuAccount;
  /** The server action that ends the session. */
  signOut: () => Promise<void>;
}

const ITEM =
  'flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 font-semibold text-foreground no-underline hover:bg-muted';

function Glyph({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={cn('size-[18px] shrink-0', className)}
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

/**
 * The signed-in account button in the wide header, which opens a menu of the account's
 * runners and pages, and signing out.
 *
 * @remarks
 * The button shows the initials, and from small screens up also the first name. The menu lists each runner with its
 * state, linking to the account page with that runner chosen; then paying what is pending,
 * adding another runner (or finishing the registration, without runners), the account
 * page, and signing out. Escape or a click outside closes it, and Escape returns focus to
 * the button. Names are personal data, so they carry `data-private` for session recordings.
 *
 * @param props - The account and the sign-out action.
 * @returns The account button with its menu.
 *
 * @example
 * ```tsx
 * <AccountMenu account={account} signOut={signOutAction} />
 * ```
 */
export function AccountMenu({ account, signOut }: AccountMenuProps) {
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const close = () => setOpen(false);
  const firstName = account.name.trim().split(/\s+/)[0] ?? account.name;
  const hasRunners = account.runners.length > 0;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        data-private
        aria-expanded={open}
        {...(open ? { 'aria-controls': menuId } : {})}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-11 max-w-48 shrink-0 cursor-pointer items-center gap-2.5 rounded-full border border-foreground bg-background px-1 font-bold text-foreground sm:ml-1 sm:pr-3"
      >
        <span
          aria-hidden="true"
          className="inline-flex size-[34px] shrink-0 items-center justify-center rounded-full bg-primary font-heading text-[17px] text-primary-foreground"
        >
          {initials(account.name)}
        </span>
        <span className="hidden truncate sm:inline">{firstName}</span>
        <Glyph
          className={cn(
            'hidden size-4 transition-transform duration-200 motion-reduce:transition-none sm:block',
            open && 'rotate-180',
          )}
        >
          <path d="M6 9l6 6 6-6" />
        </Glyph>
        <span className="sr-only">{t('accountMenu')}</span>
      </button>
      {open && (
        <nav
          id={menuId}
          aria-label={t('accountMenu')}
          className="absolute top-[calc(100%+12px)] right-0 z-50 flex w-[340px] max-w-[calc(100vw-2.5rem)] flex-col gap-0.5 rounded-[18px] border border-border bg-surface p-2 shadow-xl"
        >
          <div data-private className="flex items-center gap-3 px-2.5 pt-2.5 pb-3.5">
            <span
              aria-hidden="true"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-xl text-primary-foreground"
            >
              {initials(account.name)}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="m-0 truncate font-bold">{account.name}</p>
              <p className="m-0 text-sm text-muted-foreground">
                {t('accountSummary', { count: account.runners.length })}
              </p>
            </div>
          </div>
          {hasRunners && (
            <div className="border-t border-border">
              <RunnerLinks runners={account.runners} layout="menu" onNavigate={close} />
            </div>
          )}
          {account.payableCount > 0 && (
            <Link
              href="/payment"
              onClick={close}
              className={cn(
                buttonClasses({ variant: 'cta' }),
                'mx-1 mt-1.5 mb-1 min-h-11 py-1 text-lg',
              )}
            >
              {t('payPending', { count: account.payableCount })}
            </Link>
          )}
          <Link
            href={hasRunners ? '/account/runners/new' : '/register'}
            onClick={close}
            className={ITEM}
          >
            <Glyph>
              <path d="M12 5v14M5 12h14" />
            </Glyph>
            {hasRunners ? t('addRunner') : t('completeRegistration')}
          </Link>
          <div className="mt-1 flex flex-col gap-0.5 border-t border-border pt-1">
            <Link href="/account" onClick={close} className={ITEM}>
              <Glyph>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </Glyph>
              {t('account')}
            </Link>
            <SignOutForm action={signOut} className="flex min-h-11 items-center px-1.5" />
          </div>
        </nav>
      )}
    </div>
  );
}
