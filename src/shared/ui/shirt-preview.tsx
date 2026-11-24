import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { cn } from './cn';

const MAX_FONT_SIZE_CQW = 11.6;
const FIT_FACTOR = 94;

/** Props of {@link ShirtPreview}. */
export interface ShirtPreviewProps {
  /** The runner's chosen name. It is untrusted and rendered as plain text. */
  name: string;
  /** Extra classes for the frame. */
  className?: string;
}

/**
 * Shows the back of the official shirt with the runner's name printed on it.
 *
 * @remarks
 * The name is uppercase and scales down so a long name stays on the shirt.
 *
 * @param props - The name and optional classes.
 * @returns The shirt preview.
 */
export function ShirtPreview({ name, className }: ShirtPreviewProps) {
  const t = useTranslations('shirt');
  const trimmed = name.trim();
  const printed = (trimmed || t('placeholderName')).toLocaleUpperCase();
  const fontSize = Math.min(MAX_FONT_SIZE_CQW, FIT_FACTOR / Math.max(printed.length, 1));

  return (
    <figure
      className={cn(
        '@container relative m-0 w-full overflow-hidden rounded-2xl shadow-xl',
        className,
      )}
    >
      <Image
        src="/images/shirt/shirt-back-blank.jpg"
        alt={t('backAlt', { name: printed })}
        width={614}
        height={900}
        sizes="(max-width: 768px) 80vw, 320px"
        className="block aspect-[614/900] w-full object-cover"
      />
      <span
        aria-hidden="true"
        data-testid="shirt-name"
        className="absolute inset-x-0 top-[17.2%] flex h-[7.8%] items-center justify-center font-heading whitespace-nowrap text-[#1a1a1a]"
        style={{ fontSize: `${fontSize.toFixed(2)}cqw` }}
      >
        {printed}
      </span>
    </figure>
  );
}
