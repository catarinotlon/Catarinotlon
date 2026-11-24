import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { initials } from './initials';

/**
 * The signed-in avatar in the header, which opens the account page.
 *
 * @param props - The account holder's name.
 * @returns The avatar link.
 */
export function AccountAvatar({ name }: { name: string }) {
  const t = useTranslations('nav');

  return (
    <Link
      data-private
      href="/account"
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-lg text-primary-foreground no-underline"
    >
      <span aria-hidden="true">{initials(name)}</span>
      <span className="sr-only">{t('account')}</span>
    </Link>
  );
}
