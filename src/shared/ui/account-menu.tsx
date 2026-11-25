'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';

import { Link } from '@/i18n/navigation';

import { cn } from './cn';
import { initials } from './initials';
import { SignOutForm } from './sign-out-form';

/** Props of {@link AccountMenu}. */
export interface AccountMenuProps {
  /** The account holder's name, shown as initials on the avatar and in full in the menu. */
  name: string;
  /** Whether the account holder is an admin, who also gets a link to the panel. */
  isAdmin?: boolean;
  /** The server action that ends the session. */
  signOut: () => Promise<void>;
}

const ITEM =
  'flex min-h-11 items-center rounded-lg px-3 font-semibold text-foreground no-underline hover:bg-muted';

/**
 * The signed-in avatar in the header, which opens a menu of the account's pages and
 * signing out.
 *
 * @remarks
 * It behaves the same on every screen size. The avatar is a real button that discloses
 * the menu; Escape or a click outside closes it, and Escape returns focus to the avatar.
 * The name is personal data, so it carries `data-private` for session recordings.
 *
 * @param props - The account holder's name, role, and the sign-out action.
 * @returns The avatar with its menu.
 *
 * @example
 * ```tsx
 * <AccountMenu name="Sofía Ramírez" isAdmin={false} signOut={signOutAction} />
 * ```
 */
export function AccountMenu({ name, isAdmin = false, signOut }: AccountMenuProps) {
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const avatar = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      avatar.current?.focus();
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
        ref={avatar}
        type="button"
        data-private
        aria-expanded={open}
        {...(open ? { 'aria-controls': menuId } : {})}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary font-heading text-lg text-primary-foreground"
      >
        <span aria-hidden="true">{initials(name)}</span>
        <span className="sr-only">{t('accountMenu')}</span>
      </button>
      {open && (
        <nav
          id={menuId}
          aria-label={t('accountMenu')}
          className="absolute top-[calc(100%+8px)] right-0 z-50 flex w-64 max-w-[calc(100vw-2.5rem)] flex-col gap-1 rounded-2xl border border-border bg-background p-2 shadow-lg"
        >
          <p
            data-private
            className="m-0 truncate border-b border-border px-3 pt-1 pb-2 text-sm text-muted-foreground"
          >
            {name}
          </p>
          <Link href="/account" onClick={close} className={ITEM}>
            {t('account')}
          </Link>
          <Link href="/account/runners/new" onClick={close} className={ITEM}>
            {t('addRunner')}
          </Link>
          {isAdmin && (
            <Link href="/admin" onClick={close} className={cn(ITEM, 'text-primary-text')}>
              {t('admin')}
            </Link>
          )}
          <div className="border-t border-border pt-1">
            <SignOutForm action={signOut} className="flex min-h-11 items-center px-2" />
          </div>
        </nav>
      )}
    </div>
  );
}
