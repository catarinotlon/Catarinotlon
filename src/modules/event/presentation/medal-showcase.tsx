'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { cn } from '@/shared/ui/cn';
import { MedalInStudio } from '@/shared/ui/medal';

const DISTANCES = ['3K', '5K'] as const;
const PLACES = [
  { place: 1, key: 'first' },
  { place: 2, key: 'second' },
  { place: 3, key: 'third' },
] as const;

/**
 * Shows the finisher medal and the three podium medals of the chosen distance.
 *
 * @returns The medal showcase.
 */
export function MedalShowcase() {
  const t = useTranslations('landing.medals');
  const [distance, setDistance] = useState<(typeof DISTANCES)[number]>('5K');

  return (
    <div className="flex flex-col gap-8">
      <fieldset className="m-0 flex flex-col items-start gap-2 self-start border-0 p-0 lg:-mt-28 lg:items-end lg:self-end">
        <legend className="mb-2 p-0 text-sm font-semibold lg:ml-auto">{t('switchLabel')}</legend>
        <div className="inline-flex rounded-full border-2 border-input-border p-0.5">
          {DISTANCES.map((option) => (
            <label
              key={option}
              className={cn(
                'inline-flex min-h-11 min-w-16 cursor-pointer items-center justify-center rounded-full px-5 font-heading text-xl focus-within:outline-3 focus-within:outline-offset-3 focus-within:outline-focus',
                option === distance ? 'bg-inverse text-inverse-foreground' : 'text-foreground',
              )}
            >
              <input
                type="radio"
                name="medal-distance"
                value={option}
                checked={option === distance}
                onChange={() => setDistance(option)}
                className="sr-only"
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>

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
