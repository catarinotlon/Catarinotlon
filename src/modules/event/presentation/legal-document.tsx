import { useFormatter, useLocale, useTranslations } from 'next-intl';

import { formatMoney } from '@/i18n/money';
import { Link } from '@/i18n/navigation';
import { cn } from '@/shared/ui/cn';

import type { LegalFacts } from './legal-facts';

interface LegalBlock {
  readonly p?: string;
  readonly ul?: readonly string[];
}

interface LegalSection {
  readonly title: string;
  readonly blocks: readonly LegalBlock[];
}

/** Props of {@link LegalDocument}. */
export interface LegalDocumentProps {
  /** Which document to show. */
  document: 'privacy' | 'terms';
  /** The event facts the organizer set; a missing one keeps its bracketed gap. */
  facts?: LegalFacts;
}

type Gap = 'eventDate' | 'venue' | 'fee' | 'sizeDeadline' | 'kitPickup' | 'contactEmail';

/**
 * Shows a legal document, always marked as a draft pending legal review.
 *
 * Gaps that match an event setting (date, venue, fee, shirt-size deadline,
 * kit pickup, contact email) show the organizer's current value.
 *
 * @remarks
 * The text lives in the message files, per locale. Its bracketed gaps are
 * deliberate and must not be filled in without legal review.
 *
 * @param props - Which document to show.
 * @returns The document.
 */
export function LegalDocument({ document, facts }: LegalDocumentProps) {
  const t = useTranslations('legal');
  const footer = useTranslations('footer');
  const format = useFormatter();
  const locale = useLocale();
  const values: Record<Gap, string | null> = {
    eventDate: facts?.eventDate
      ? format.dateTime(new Date(`${facts.eventDate}T12:00:00Z`), { dateStyle: 'long' })
      : null,
    venue: facts?.venue ?? null,
    fee: facts?.feeCents == null ? null : formatMoney(facts.feeCents, locale),
    sizeDeadline: facts?.sizeDeadline
      ? format.dateTime(new Date(facts.sizeDeadline), { dateStyle: 'long' })
      : null,
    kitPickup: facts?.kitPickup ?? null,
    contactEmail: facts?.contactEmail ?? null,
  };
  const fill = (text: string) =>
    text.replace(/\{(\w+)\}/g, (token, key: string) =>
      key in values ? (values[key as Gap] ?? t(`gaps.${key as Gap}`)) : token,
    );
  const sections = t.raw(`${document}.sections`) as readonly LegalSection[];
  const tabs = ['privacy', 'terms'] as const;

  return (
    <article className="flex flex-col gap-6">
      <nav aria-label={t(`${document}.title`)} className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab}
            href={`/${tab}`}
            aria-current={tab === document ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 items-center rounded-full border-2 border-input-border px-4 text-sm font-semibold no-underline',
              tab === document ? 'bg-inverse text-inverse-foreground' : 'text-foreground',
            )}
          >
            {footer(tab)}
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-3">
        <p className="m-0 self-start rounded-full border-2 border-dashed border-input-border px-3 py-1 text-sm font-semibold">
          {t('draft')}
        </p>
        <h1 className="m-0 font-heading text-5xl">{t(`${document}.title`)}</h1>
        <p className="m-0 text-sm text-muted-foreground">{t('updated')}</p>
      </div>
      {sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-2">
          <h2 className="m-0 font-display text-2xl font-bold uppercase">{section.title}</h2>
          {section.blocks.map((block, index) =>
            block.ul ? (
              <ul key={index} className="m-0 flex list-disc flex-col gap-1 pl-5">
                {block.ul.map((item) => (
                  <li key={item}>{fill(item)}</li>
                ))}
              </ul>
            ) : (
              <p key={index} className="m-0">
                {fill(block.p ?? '')}
              </p>
            ),
          )}
        </section>
      ))}
    </article>
  );
}
