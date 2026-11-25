'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Link } from '@/i18n/navigation';

import { buttonClasses } from './button';
import { cn } from './cn';
import { initials } from './initials';
import { LanguageSwitch } from './language-switch';
import { SignOutForm } from './sign-out-form';
import { RunnerLinks, type MenuAccount } from './runner-links';
import { ThemeSwitch } from './theme-switch';

export type { MenuAccount, MenuRunner, MenuRunnerStage } from './runner-links';

/** A section link of the menu. */
export interface MenuSection {
  /** Where it leads. */
  href: string;
  /** Its name. */
  label: string;
  /** Its icon, drawn in the brand red. */
  icon: ReactNode;
}

/** Props of {@link SiteMenu}. */
export interface SiteMenuProps {
  /** The section links. */
  sections: readonly MenuSection[];
  /** Whether the visitor is an admin, who also gets a link to the panel. */
  isAdmin?: boolean;
  /** The signed-in account, or nothing for a visitor without a session. */
  account?: MenuAccount | null;
  /** The server action that ends the session. */
  signOut?: () => Promise<void>;
  /** Classes for the menu button, such as the screen sizes it shows on. */
  className?: string;
}

const ROUND_BUTTON =
  'inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-border bg-transparent text-foreground hover:bg-muted';

function Glyph({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={cn('size-5 shrink-0', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-lg text-primary-foreground"
    >
      {initials(name)}
    </span>
  );
}

/**
 * The menu button and the drawer it opens: on phones it holds everything the header has
 * no room for.
 *
 * @remarks
 * The drawer is a modal `<dialog>` that slides in from the right and back out when it
 * closes (at once for visitors who prefer reduced motion): the page behind it is inert and
 * dims, Escape or a tap outside closes it, and focus returns to the menu button. Its
 * first level has the section links, the theme and language switches, and either the
 * sign-in links or the account card. The card opens a second level with the account's
 * runners, each linking to the account page with that runner chosen, a link to add
 * another runner (or to finish registering, without runners), a link to the account page,
 * a link to pay what is pending, and signing out. Names are personal data, so they carry `data-private`.
 *
 * @param props - The sections, the visitor's role and account, and the sign-out action.
 * @returns The menu button with its drawer.
 *
 * @example
 * ```tsx
 * <SiteMenu sections={sections} account={account} signOut={signOutAction} className="lg:hidden" />
 * ```
 */
export function SiteMenu({
  sections,
  isAdmin = false,
  account = null,
  signOut,
  className,
}: SiteMenuProps) {
  const t = useTranslations('nav');
  const common = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<'main' | 'account'>('main');
  const trigger = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLButtonElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement | null>(null);
  const previousLevel = useRef(level);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (wasOpen.current && !open) trigger.current?.focus();
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (previousLevel.current === level) return;
    previousLevel.current = level;
    if (level === 'account') back.current?.focus();
    else card.current?.focus();
  }, [level]);

  const [closing, setClosing] = useState(false);

  const finishClosing = () => {
    // Closing the native dialog first lets the browser return focus to the menu button.
    if (dialog.current?.open) dialog.current.close();
    setClosing(false);
    setOpen(false);
    setLevel('main');
    previousLevel.current = 'main';
  };

  const close = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finishClosing();
    else setClosing(true);
  };

  useEffect(() => {
    if (!closing) return;
    // Removes the drawer even if the slide-out never reports its end.
    const fallback = window.setTimeout(finishClosing, 450);
    return () => window.clearTimeout(fallback);
  }, [closing]);

  const closeButton = (
    <button type="button" aria-label={t('closeMenu')} onClick={close} className={ROUND_BUTTON}>
      <Glyph d="M6 6l12 12M18 6L6 18" />
    </button>
  );

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('openMenu')}
        onClick={() => setOpen(true)}
        className={cn(ROUND_BUTTON, className)}
      >
        <Glyph d="M4 7h16M4 12h16M4 17h16" />
      </button>
      {open && (
        <dialog
          ref={(node) => {
            dialog.current = node;
            if (node && !node.open) node.showModal();
          }}
          aria-label={t('menu')}
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            close();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
          onTransitionEnd={(event) => {
            if (closing && event.target === event.currentTarget) finishClosing();
          }}
          {...(closing ? { 'data-closing': '' } : {})}
          className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-[min(22rem,calc(100vw-3rem))] max-w-none overflow-y-auto rounded-l-3xl border-0 bg-surface p-0 text-foreground shadow-2xl transition-transform duration-300 ease-out backdrop:bg-ink/60 backdrop:transition-colors backdrop:duration-300 data-closing:translate-x-full data-closing:ease-in data-closing:backdrop:bg-transparent motion-reduce:transition-none motion-reduce:backdrop:transition-none starting:translate-x-full starting:backdrop:bg-transparent"
        >
          {level === 'main' || !account ? (
            <div className="flex min-h-full flex-col gap-5 px-5 pt-3.5 pb-6">
              <div className="flex items-center justify-between">
                <p className="m-0 font-heading text-3xl">{t('menu')}</p>
                {closeButton}
              </div>
              {account && (
                <button
                  ref={card}
                  type="button"
                  data-private
                  onClick={() => setLevel('account')}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border-0 bg-surface-raised p-3 text-left text-foreground"
                >
                  <Avatar name={account.name} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate font-bold">{account.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {t('accountSummary', { count: account.runners.length })}
                    </span>
                  </span>
                  <Glyph d="M9 6l6 6-6 6" />
                </button>
              )}
              <nav aria-label={t('menu')} className="flex flex-col">
                {sections.map((section) => (
                  <a
                    key={section.href}
                    href={section.href}
                    onClick={close}
                    className="flex min-h-13 items-center gap-3.5 font-semibold text-foreground no-underline hover:text-primary-text"
                  >
                    <span
                      aria-hidden="true"
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-raised text-primary-text"
                    >
                      {section.icon}
                    </span>
                    {section.label}
                  </a>
                ))}
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={close}
                    className="flex min-h-13 items-center gap-3.5 font-semibold text-primary-text no-underline hover:underline"
                  >
                    <span
                      aria-hidden="true"
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-raised"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="size-[18px]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </span>
                    {t('admin')}
                  </Link>
                )}
              </nav>
              <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <ThemeSwitch variant="segmented" />
                  <LanguageSwitch variant="compact" />
                </div>
                {account ? (
                  signOut && (
                    <SignOutForm action={signOut} className="flex min-h-11 justify-center" />
                  )
                ) : (
                  <>
                    <Link
                      href="/sign-up"
                      onClick={close}
                      className={cn(buttonClasses({ variant: 'cta', fullWidth: true }), 'text-lg')}
                    >
                      {common('register')}
                    </Link>
                    <Link
                      href="/sign-in"
                      onClick={close}
                      className={cn(
                        buttonClasses({ variant: 'outline', fullWidth: true }),
                        'min-h-12 rounded-full font-display text-lg font-extrabold uppercase italic',
                      )}
                    >
                      {common('signIn')}
                    </Link>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex min-h-full flex-col gap-5 px-5 pt-3.5 pb-6">
              <div className="flex items-center justify-between">
                <button
                  ref={back}
                  type="button"
                  aria-label={t('backToMenu')}
                  onClick={() => setLevel('main')}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-surface-raised pr-4 pl-2 font-semibold text-foreground"
                >
                  <Glyph d="M15 6l-6 6 6 6" />
                  {t('menu')}
                </button>
                {closeButton}
              </div>
              <div data-private className="flex items-center gap-3">
                <Avatar name={account.name} />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="m-0 font-heading text-2xl">{t('yourAccount')}</p>
                  <p className="m-0 truncate text-sm text-muted-foreground">{account.name}</p>
                </div>
              </div>
              <nav aria-label={t('yourAccount')} className="flex flex-1 flex-col gap-4">
                {account.runners.length > 0 && (
                  <RunnerLinks runners={account.runners} layout="drawer" onNavigate={close} />
                )}
                <Link
                  href={account.runners.length > 0 ? '/account/runners/new' : '/register'}
                  onClick={close}
                  className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-dashed border-border px-3 font-semibold text-foreground no-underline hover:bg-muted"
                >
                  <Glyph d="M12 5v14M5 12h14" className="text-primary-text" />
                  {account.runners.length > 0 ? t('addRunner') : t('completeRegistration')}
                </Link>
                <Link
                  href="/account"
                  onClick={close}
                  className="-mx-2.5 flex min-h-14 items-center gap-3.5 rounded-2xl px-2.5 py-1.5 text-foreground no-underline hover:bg-muted"
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-raised text-primary-text"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="size-[18px]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21a8 8 0 0 1 16 0" />
                    </svg>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[17px] font-bold">{t('account')}</span>
                    <span className="text-sm text-muted-foreground">{t('accountHint')}</span>
                  </span>
                  <Glyph d="M9 6l6 6-6 6" />
                </Link>
                <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
                  {account.payableCount > 0 && (
                    <Link
                      href="/payment"
                      onClick={close}
                      className={cn(buttonClasses({ variant: 'cta', fullWidth: true }), 'text-lg')}
                    >
                      {t('payPending', { count: account.payableCount })}
                    </Link>
                  )}
                  {signOut && (
                    <SignOutForm action={signOut} className="flex min-h-11 justify-center" />
                  )}
                </div>
              </nav>
            </div>
          )}
        </dialog>
      )}
    </>
  );
}
