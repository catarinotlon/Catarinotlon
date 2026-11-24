import type { ReactNode } from 'react';

import { cn } from './cn';
import { SiteFooter } from './site-footer';
import { SiteHeader, type SiteHeaderProps } from './site-header';

/** Props of {@link PageShell}. */
export interface PageShellProps extends SiteHeaderProps {
  /** The page content. */
  children: ReactNode;
  /** The content column's width. */
  width?: 'narrow' | 'medium' | 'wide';
  /** Whether this is an admin page, which the footer names. */
  admin?: boolean;
  /** A full-width band under the header, such as the admin tabs. */
  subheader?: ReactNode;
  /** The page background. Long documents read on the plain one. */
  background?: 'muted' | 'plain';
  /** Centers the content vertically, for short status cards. */
  centered?: boolean;
}

const WIDTHS = { narrow: 'max-w-[540px]', medium: 'max-w-3xl', wide: 'max-w-[1200px]' };

/**
 * The header, content column, and footer shared by inner pages.
 *
 * @param props - The content, its width, and the header options.
 * @returns The page frame.
 */
export function PageShell({
  children,
  width = 'wide',
  admin,
  subheader,
  background = 'muted',
  centered = false,
  ...header
}: PageShellProps) {
  return (
    <div
      className={cn(
        'flex min-h-screen flex-col',
        background === 'muted' ? 'bg-page' : 'bg-background',
      )}
    >
      <SiteHeader {...header} />
      {subheader}
      <main
        id="main"
        className={cn(
          'flex flex-1 flex-col px-5 py-8 md:px-10 md:py-12',
          centered && 'justify-center',
        )}
      >
        <div className={cn('mx-auto w-full', WIDTHS[width])}>{children}</div>
      </main>
      <SiteFooter {...(admin ? { admin } : {})} />
    </div>
  );
}

/** Props of {@link SplitLayout}. */
export interface SplitLayoutProps {
  /** The left column: the page's introduction and artwork. */
  aside: ReactNode;
  /** The right column, usually a form card. */
  children: ReactNode;
}

/**
 * Two columns on wide screens, with the aside first when stacked.
 *
 * @param props - The aside and the main column.
 * @returns The layout.
 */
export function SplitLayout({ aside, children }: SplitLayoutProps) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-14">
      <div className="flex min-w-0 flex-col gap-6">{aside}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * A short uppercase line above a title, with the logo's speed lines.
 *
 * @param props - The text and optional classes.
 * @returns The eyebrow.
 */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'm-0 inline-flex items-center gap-2 font-display font-bold tracking-widest text-primary-text uppercase',
        className,
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 22 12"
        className="h-3 w-[22px] shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M6 1h15M1 6h20M6 11h15" />
      </svg>
      {children}
    </p>
  );
}

/** Props of {@link PageIntro}. */
export interface PageIntroProps {
  /** A short line above the title. */
  eyebrow?: string;
  /** The page title. */
  title: string;
  /** A short paragraph. */
  body: string;
}

/**
 * A page's eyebrow, title, and opening paragraph.
 *
 * @param props - The texts.
 * @returns The introduction.
 */
export function PageIntro({ eyebrow, title, body }: PageIntroProps) {
  return (
    <div className="flex flex-col gap-3">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h1 className="m-0 font-heading text-4xl md:text-5xl">{title}</h1>
      <p className="m-0 max-w-xl text-muted-foreground">{body}</p>
    </div>
  );
}

/**
 * The red dotted panel that frames the shirt and the medal.
 *
 * @param props - The artwork and optional classes.
 * @returns The panel.
 */
export function DottedStage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-3xl dotted-panel p-5 md:p-8', className)}>{children}</div>;
}

/**
 * A raised panel on the page background.
 *
 * @param props - The content and optional classes.
 * @returns The card.
 */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-border bg-surface p-5 md:p-8', className)}>
      {children}
    </section>
  );
}
