import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { cn } from '@/shared/ui/cn';

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
}

/**
 * Shows a legal document, always marked as a draft pending legal review.
 *
 * @remarks
 * The text lives in the message files, per locale. Its bracketed gaps are
 * deliberate and must not be filled in without legal review.
 *
 * @param props - Which document to show.
 * @returns The document.
 */
export function LegalDocument({ document }: LegalDocumentProps) {
  const t = useTranslations('legal');
  const footer = useTranslations('footer');
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
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p key={index} className="m-0">
                {block.p}
              </p>
            ),
          )}
        </section>
      ))}
    </article>
  );
}
