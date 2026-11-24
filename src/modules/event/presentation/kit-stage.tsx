import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { MedalInStudio } from '@/shared/ui/medal';
import { DottedStage } from '@/shared/ui/page-shell';

/**
 * The official shirt and the finisher medal on the dotted red panel.
 *
 * @param props - Optional classes for the panel.
 * @returns The artwork.
 */
export function KitStage({ className }: { className?: string }) {
  const shirt = useTranslations('shirt');
  const medals = useTranslations('landing.medals');

  return (
    <DottedStage
      className={`grid grid-cols-[3fr_2fr] items-center gap-4 ${className ?? ''}`.trim()}
    >
      <Image
        src="/images/shirt/shirt-front.jpg"
        alt={shirt('frontAlt')}
        width={612}
        height={834}
        priority
        sizes="(max-width: 1024px) 55vw, 320px"
        className="h-auto w-full -rotate-2 rounded-2xl bg-surface shadow-xl"
      />
      <MedalInStudio
        kind="finisher"
        distance="5K"
        label={medals('finisherAlt', { distance: '5K' })}
        sizes="(max-width: 1024px) 28vw, 150px"
        priority
        frameClassName="rotate-3"
        className="max-h-[420px] w-auto"
      />
    </DottedStage>
  );
}
