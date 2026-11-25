'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { MedalInStudio } from '@/shared/ui/medal';
import { SegmentedControl } from '@/shared/ui/segmented-control';

const DISTANCES = ['3K', '5K'] as const;
const PLACES = [
  { place: 1, key: 'first' },
  { place: 2, key: 'second' },
  { place: 3, key: 'third' },
] as const;

/**
 * Shows the finisher medal and the three podium medals of the chosen distance.
 *
 * @remarks
 * The distance switch slides its highlight to the chosen option, unless the visitor
 * prefers reduced motion.
 *
 * @returns The medal showcase.
 */
export function MedalShowcase() {
  const t = useTranslations('landing.medals');
  const [distance, setDistance] = useState<(typeof DISTANCES)[number]>('5K');

  return (
    <div className="flex flex-col gap-8">
      <SegmentedControl
        legend={t('switchLabel')}
        legendClassName="mb-2 text-sm font-semibold lg:ml-auto"
        className="flex flex-col items-start gap-2 self-start lg:-mt-28 lg:items-end lg:self-end"
        name="medal-distance"
        options={DISTANCES.map((option) => ({ value: option, label: option }))}
        value={distance}
        onChange={(option) => setDistance(option as (typeof DISTANCES)[number])}
      />

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <article className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface p-6">
          <p className="m-0 rounded-full border border-gold px-3 py-0.5 text-sm font-bold tracking-widest text-gold uppercase">
            {t('finisherEyebrow')}
          </p>
          <div className="w-44 self-center md:w-52">
            <MedalInStudio
              kind="finisher"
              distance={distance}
              label={t('finisherAlt', { distance })}
            />
          </div>
          <h3 className="m-0 text-left font-heading text-3xl">
            {t('finisherTitle', { distance })}
          </h3>
          <p className="m-0 text-muted-foreground">{t('finisherBody')}</p>
        </article>

        <article className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
          <p className="m-0 self-start rounded-full border border-gold px-3 py-0.5 text-sm font-bold tracking-widest text-gold uppercase">
            {t('podiumEyebrow')}
          </p>
          <ul className="m-0 grid list-none grid-cols-3 gap-3 p-0">
            {PLACES.map(({ place, key }) => (
              <li key={key} className="flex flex-col items-center justify-end gap-2">
                <div className="w-full max-w-40">
                  <MedalInStudio
                    kind="podium"
                    distance={distance}
                    place={place}
                    label={t('podiumAlt', { distance, place: t(key) })}
                    frameClassName="p-1.5 sm:p-3"
                  />
                </div>
                <span className="text-center font-display font-bold tracking-wider uppercase">
                  {t(key)}
                </span>
              </li>
            ))}
          </ul>
          <h3 className="m-0 text-left font-heading text-3xl">{t('podiumTitle', { distance })}</h3>
          <p className="m-0 text-muted-foreground">{t('podiumBody')}</p>
        </article>
      </div>
    </div>
  );
}
