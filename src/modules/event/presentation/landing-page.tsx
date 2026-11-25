import Image from 'next/image';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { formatMoney } from '@/i18n/money';
import { formatStartTime, formatStartTimeParts } from '@/i18n/start-time';
import { Link } from '@/i18n/navigation';
import { buttonClasses } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import { Eyebrow } from '@/shared/ui/page-shell';
import { RaceBib } from '@/shared/ui/race-bib';

import type { LandingFacts } from './landing-facts';
import { KitStage } from './kit-stage';
import { MedalShowcase } from './medal-showcase';
import { ShirtTryOn } from './shirt-try-on';

/** An illustrative bib for the kit section, for either distance; real numbers are assigned per registration. */
const SAMPLE_BIB = { number: '48213', distance: '3K/5K' } as const;

/** Intrinsic size of each shirt photo, at the photos' own aspect ratio. */
const SHIRT_PHOTO_SIZE = {
  front: { width: 612, height: 830 },
  back: { width: 612, height: 897 },
} as const;

/** Props of {@link LandingPage}. */
export interface LandingPageProps {
  /** The public event facts. */
  facts: LandingFacts;
}

function Section({
  id,
  eyebrow,
  title,
  body,
  children,
  muted = false,
  dark = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  body?: string;
  children: ReactNode;
  muted?: boolean;
  dark?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-10 px-5 py-14 md:scroll-mt-0 md:px-10 md:py-24',
        muted && 'bg-page',
        dark && 'dark bg-ink text-foreground',
      )}
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 md:gap-12">
        <div className="flex flex-col gap-3">
          <Eyebrow className={cn('text-lg', dark && 'text-gold')}>{eyebrow}</Eyebrow>
          <h2 className="m-0 font-heading text-[clamp(38px,4.5vw,64px)] font-extrabold text-balance">
            {title}
          </h2>
          {body && <p className="m-0 max-w-2xl text-lg text-muted-foreground">{body}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

function OpeningSoon() {
  const t = useTranslations('common');
  return (
    <div role="status" className="rounded-xl bg-inverse px-5 py-4 text-inverse-foreground">
      <p className="m-0 font-bold">{t('openingSoonTitle')}</p>
      <p className="m-0 text-sm">{t('openingSoonBody')}</p>
    </div>
  );
}

function DistanceCard(props: {
  distance: '3K' | '5K';
  title: string;
  body: string;
  cta: string;
  start: string;
  fee: string;
}) {
  const t = useTranslations('landing.distances');
  const featured = props.distance === '5K';

  return (
    <article
      data-testid={`distance-${props.distance}`}
      className={cn(
        'flex flex-col gap-5 rounded-[28px] border-[3px] p-6 md:p-8',
        featured
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-input-border bg-surface',
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h3 className="m-0 font-heading text-8xl">{props.distance}</h3>
        <p
          className={cn(
            'm-0 rounded-full px-4 py-1 font-display font-bold tracking-widest uppercase',
            featured ? 'bg-white text-ink' : 'bg-inverse text-inverse-foreground',
          )}
        >
          {props.title}
        </p>
      </div>
      <p className={cn('m-0', !featured && 'text-muted-foreground')}>{props.body}</p>
      <dl className="m-0 flex flex-col">
        {[
          [t('start'), props.start],
          [t('fee'), props.fee],
        ].map(([label, value]) => (
          <div
            key={label}
            className={cn(
              'flex justify-between gap-3 border-t py-2',
              featured ? 'border-white/40' : 'border-border',
            )}
          >
            <dt>{label}</dt>
            <dd className="m-0 font-bold">{value}</dd>
          </div>
        ))}
      </dl>
      <Link
        href="/sign-up"
        className={cn(
          buttonClasses({ variant: 'cta', fullWidth: true }),
          'mt-auto',
          featured ? 'bg-white text-ink' : 'bg-inverse text-inverse-foreground',
        )}
      >
        {props.cta}
      </Link>
    </article>
  );
}

function Check() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-primary"
    >
      ✓
    </span>
  );
}

function RouteArt({ start, finish }: { start: string; finish: string }) {
  return (
    <div aria-hidden="true" className="relative aspect-[16/9] w-full text-foreground">
      <svg viewBox="0 0 320 180" className="size-full" fill="none">
        <path
          d="M50 150c6-36 50-44 110-52s88-24 92-62"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="0.1 9"
        />
        <circle cx="50" cy="152" r="9" stroke="currentColor" strokeWidth="5" />
        <path
          d="M254 4a19 19 0 0 0-19 19c0 14 19 32 19 32s19-18 19-32A19 19 0 0 0 254 4Z"
          fill="var(--primary)"
        />
        <circle cx="254" cy="23" r="7" fill="var(--ink)" />
      </svg>
      <span className="absolute top-[8%] right-[26%] font-display font-bold tracking-widest uppercase">
        {finish}
      </span>
      <span className="absolute bottom-[6%] left-[24%] font-display font-bold tracking-widest uppercase">
        {start}
      </span>
    </div>
  );
}

/** A start time: the clock large, the half of the day smaller, so it reads at a glance. */
function MapPin() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-3.5 shrink-0 text-gold"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function StartTime({ time, pending }: { time: string | null; pending: string }) {
  const locale = useLocale();
  if (!time) return pending;
  const { clock, period } = formatStartTimeParts(time, locale);
  return (
    <span className="text-4xl leading-none md:text-5xl">
      {clock}{' '}
      <span className="text-lg font-semibold text-muted-foreground normal-case md:text-2xl">
        {period}
      </span>
    </span>
  );
}

/**
 * The public landing page. It has no registration form of its own.
 *
 * @remarks
 * A missing event fact shows a neutral "to be confirmed", never an invented value.
 *
 * @param props - The public event facts.
 * @returns The page content.
 */
export function LandingPage({ facts }: LandingPageProps) {
  const t = useTranslations('landing');
  const common = useTranslations('common');
  const format = useFormatter();
  const locale = useLocale();
  const pending = common('pending');

  const time = (value: string | null) => (value ? formatStartTime(value, locale) : pending);
  const date = facts.eventDate
    ? format.dateTime(new Date(`${facts.eventDate}T12:00:00Z`), { dateStyle: 'long' })
    : pending;
  const fee =
    facts.feeAmount === null ? pending : formatMoney(Math.round(facts.feeAmount * 100), locale);
  const startThree = time(facts.startThree);
  const startFive = time(facts.startFive);
  const start =
    facts.startThree && facts.startFive
      ? t('raceDay.startValue', { three: startThree, five: startFive })
      : pending;
  const sizes = facts.shirtSizes.length > 0 ? facts.shirtSizes.join(', ') : pending;

  const faq = [
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2', { details: facts.kitPickup ?? pending }) },
    { q: t('faq.q3'), a: t('faq.a3') },
    { q: t('faq.q4'), a: t('faq.a4') },
    { q: t('faq.q5'), a: t('faq.a5') },
  ];

  return (
    <main id="main">
      <section id="inicio" className="px-5 pt-8 pb-12 md:px-10 md:pt-12 md:pb-16">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 lg:grid-cols-2">
          <div className="flex flex-col items-start gap-6">
            <Eyebrow className="text-lg">{t('hero.eyebrow')}</Eyebrow>
            <h1 className="m-0 flex flex-col gap-1 font-heading text-[clamp(50px,6.5vw,96px)] leading-[0.9]">
              <span>{common('appName')}</span>
              <span className="flex flex-wrap items-center gap-3">
                <span className="text-primary-text">{common('year')}</span>
                <span className="rounded-full border-[3px] border-input-border px-[0.5em] py-[0.16em] text-[0.4em] leading-none">
                  3K
                </span>
                <span className="rounded-full border-[3px] border-inverse bg-inverse px-[0.5em] py-[0.16em] text-[0.4em] leading-none text-inverse-foreground">
                  5K
                </span>
              </span>
            </h1>
            <p className="m-0 max-w-[520px] text-lg text-pretty">{t('hero.body')}</p>
            {!facts.paymentOpen && <OpeningSoon />}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/sign-up" className={buttonClasses({ variant: 'cta' })}>
                {t('hero.cta')}
              </Link>
              <a
                href="#kit"
                className="inline-flex min-h-12 items-center font-semibold text-foreground underline underline-offset-4"
              >
                {t('hero.kitCta')}
              </a>
            </div>
            <p className="m-0 text-sm text-muted-foreground">
              {t('hero.includes')} {t('hero.alreadyRegistered')}{' '}
              <Link
                href="/sign-in"
                className="font-semibold text-foreground underline underline-offset-4"
              >
                {t('hero.signIn')}
              </Link>
            </p>
          </div>
          <KitStage className="min-h-[340px]" />
        </div>
      </section>

      <div
        data-testid="facts-band"
        className="dark bg-ink px-5 py-6 text-foreground md:px-10 md:py-10"
      >
        <dl className="m-0 mx-auto grid max-w-[1200px] grid-cols-2 md:grid-cols-4">
          {[
            {
              key: 'date',
              label: t('hero.date'),
              value: date,
              className: 'order-1 border-b pr-4 md:border-b-0 md:pr-6',
            },
            {
              key: 'startThree',
              label: t('hero.startDistance', { distance: '3K' }),
              value: <StartTime time={facts.startThree} pending={pending} />,
              className: 'order-3 pt-4 pr-4 md:order-2 md:border-l md:px-6 md:pt-1',
            },
            {
              key: 'startFive',
              label: t('hero.startDistance', { distance: '5K' }),
              value: <StartTime time={facts.startFive} pending={pending} />,
              className: 'order-4 border-l pt-4 pl-4 md:order-3 md:px-6 md:pt-1',
            },
            {
              key: 'venue',
              label: t('hero.venue'),
              value: facts.venue ?? pending,
              action:
                facts.venue && facts.venueMapUrl ? (
                  <a
                    href={facts.venueMapUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                    aria-label={t('hero.venueMapLabel', { venue: facts.venue })}
                    className="relative -my-1.5 flex h-7 items-center gap-1 rounded-full border border-border px-2.5 text-[0.6875rem] leading-none tracking-wider text-foreground no-underline transition-colors before:absolute before:-inset-x-1 before:-inset-y-2 before:content-[''] hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                  >
                    <MapPin />
                    {t('hero.venueMap')}
                  </a>
                ) : null,
              className: 'order-2 border-b border-l pl-4 md:order-4 md:border-b-0 md:pl-6',
            },
          ].map(({ key, label, value, action, className }) => (
            <div
              key={key}
              className={cn('flex flex-col gap-2 border-border pb-4 md:pb-1', className)}
            >
              <dt className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs font-bold tracking-widest text-gold uppercase md:justify-start">
                {label}
                {action}
              </dt>
              <dd className="m-0 font-display text-2xl leading-tight font-bold break-words uppercase md:text-3xl">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <Section
        id="distancias"
        eyebrow={t('distances.eyebrow')}
        title={t('distances.title')}
        body={t('distances.body')}
      >
        <div className="grid gap-6 md:grid-cols-2">
          <DistanceCard
            distance="3K"
            title={t('distances.threeTitle')}
            body={t('distances.threeBody')}
            cta={t('distances.threeCta')}
            start={startThree}
            fee={fee}
          />
          <DistanceCard
            distance="5K"
            title={t('distances.fiveTitle')}
            body={t('distances.fiveBody')}
            cta={t('distances.fiveCta')}
            start={startFive}
            fee={fee}
          />
        </div>
        <p className="m-0 flex items-start gap-2 font-bold">
          <span aria-hidden="true" className="text-primary-text">
            ✓
          </span>
          <span className="font-bold">{t('distances.footnote')}</span>
        </p>
      </Section>

      <Section
        id="kit"
        muted
        eyebrow={t('kit.eyebrow')}
        title={t('kit.title')}
        body={t('kit.body')}
      >
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div className="grid grid-cols-2 gap-4">
            {(['front', 'back'] as const).map((side) => (
              <figure key={side} className="relative m-0">
                <Image
                  src={`/images/shirt/shirt-${side}.jpg`}
                  alt={t(`kit.${side}`)}
                  {...SHIRT_PHOTO_SIZE[side]}
                  sizes="(max-width: 768px) 45vw, 280px"
                  className="block h-auto w-full rounded-xl"
                />
                <figcaption className="absolute top-2 left-2 rounded-full bg-ink px-3 py-1 text-sm font-bold text-primary-foreground uppercase">
                  {t(`kit.${side}`)}
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="m-0 font-heading text-3xl">{t('kit.shirtTitle')}</h3>
            <p className="m-0 text-muted-foreground">{t('kit.shirtBody')}</p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 font-semibold">
              {[t('kit.nameOnBack'), t('kit.logo'), t('kit.sizes', { sizes })].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span aria-hidden="true" className="font-bold text-primary-text">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="grid items-center gap-8 rounded-2xl border border-border bg-background p-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:p-8">
          <RaceBib
            number={SAMPLE_BIB.number}
            distance={SAMPLE_BIB.distance}
            brand={common('appName')}
            year={common('year')}
            label={t('kit.bibLabel', SAMPLE_BIB)}
            className="mx-auto max-w-[360px]"
          />
          <div className="flex flex-col gap-4">
            <h3 className="m-0 font-heading text-3xl">{t('kit.bibTitle')}</h3>
            <p className="m-0 text-muted-foreground">{t('kit.bibBody')}</p>
            <dl className="m-0 border-t border-border pt-3">
              <dt className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                {t('kit.pickup')}
              </dt>
              <dd className="m-0 font-bold">{facts.kitPickup ?? pending}</dd>
              <dd className="m-0 text-sm text-muted-foreground">{t('kit.pickupNote')}</dd>
            </dl>
          </div>
        </div>
      </Section>

      <Section
        id="medallas"
        dark
        eyebrow={t('medals.eyebrow')}
        title={t('medals.title')}
        body={t('medals.body')}
      >
        <MedalShowcase />
      </Section>

      <Section id="dia-de-carrera" eyebrow={t('raceDay.eyebrow')} title={t('raceDay.title')}>
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-2xl bg-muted p-6">
            <RouteArt start={t('raceDay.routeStartLabel')} finish={t('raceDay.routeFinishLabel')} />
            {facts.routeMapUrl ? (
              <a
                href={facts.routeMapUrl}
                rel="noopener noreferrer"
                target="_blank"
                className={cn(buttonClasses({ variant: 'outline' }), 'self-start')}
              >
                {t('raceDay.routeLink')}
              </a>
            ) : (
              <p className="m-0 text-sm text-muted-foreground">{t('raceDay.routePending')}</p>
            )}
          </div>
          <ol
            aria-label={t('raceDay.title')}
            className="m-0 flex list-none flex-col gap-7 border-l-3 border-dotted border-inverse p-0 pl-8"
          >
            {[
              [t('raceDay.kitPickup'), facts.kitPickup ?? pending, t('raceDay.kitPickupNote')],
              [t('raceDay.start'), start],
              [t('raceDay.finish'), t('raceDay.finishBody')],
            ].map(([label, value, note], index) => (
              <li key={label} className="relative">
                {index === 2 ? (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 30"
                    className="absolute -top-0.5 -left-[46px] h-7 w-6 bg-background"
                  >
                    <path
                      d="M12 1a11 11 0 0 0-11 11c0 8 11 17 11 17s11-9 11-17A11 11 0 0 0 12 1Z"
                      fill="var(--primary)"
                    />
                    <circle cx="12" cy="12" r="4.5" fill="var(--ink)" />
                  </svg>
                ) : (
                  <span
                    aria-hidden="true"
                    className="absolute top-0.5 -left-[44px] size-5 rounded-full border-4 border-inverse bg-background"
                  />
                )}
                <p
                  className={cn(
                    'm-0 font-display text-xl font-bold uppercase',
                    index === 2 && 'text-primary-text',
                  )}
                >
                  {label}
                </p>
                <p className="m-0 text-muted-foreground">{value}</p>
                {note && <p className="m-0 mt-1 text-sm font-semibold">{note}</p>}
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <section
        id="inscripcion"
        className="scroll-mt-10 bg-primary px-5 py-14 text-primary-foreground md:scroll-mt-0 md:px-10 md:py-24"
      >
        <div className="mx-auto grid max-w-[1200px] items-start gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <Eyebrow className="text-lg text-primary-foreground">{t('signup.eyebrow')}</Eyebrow>
            <h2 className="m-0 font-heading text-[clamp(38px,4.5vw,64px)] font-extrabold text-balance">
              {t('signup.title')}
            </h2>
            <p className="m-0 max-w-[480px] text-lg">{t('signup.body')}</p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 font-semibold">
              {[t('signup.shirtPerk'), t('signup.bibPerk'), t('signup.medalPerk')].map((perk) => (
                <li key={perk} className="flex items-center gap-2">
                  <Check />
                  {perk}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-4 rounded-3xl bg-surface p-6 text-foreground md:p-8">
            <ShirtTryOn title={t('signup.tryOn')} />
            <ol className="m-0 flex list-none flex-col gap-2 border-t border-border p-0 pt-4">
              {([1, 2, 3] as const).map((step) => (
                <li key={step} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-inverse text-sm font-bold text-inverse-foreground"
                  >
                    {step}
                  </span>
                  <span>
                    <strong>{t(`signup.step${step}Title`)}</strong>{' '}
                    <span className="text-muted-foreground">{t(`signup.step${step}Body`)}</span>
                  </span>
                </li>
              ))}
            </ol>
            {!facts.paymentOpen && <OpeningSoon />}
            <Link href="/sign-up" className={buttonClasses({ variant: 'cta', fullWidth: true })}>
              {t('signup.cta')}
            </Link>
            <Link
              href="/sign-in"
              className={cn(
                buttonClasses({ variant: 'outline', fullWidth: true }),
                'rounded-full font-display text-lg font-extrabold uppercase italic',
              )}
            >
              {t('signup.signIn')}
            </Link>
          </div>
        </div>
      </section>

      <section id="preguntas" className="scroll-mt-10 px-5 py-14 md:scroll-mt-0 md:px-10 md:py-24">
        <div className="mx-auto grid max-w-[1200px] items-start gap-8 lg:grid-cols-[2fr_3fr]">
          <div className="flex flex-col gap-3">
            <Eyebrow className="text-lg">{t('faq.eyebrow')}</Eyebrow>
            <h2 className="m-0 font-heading text-[clamp(38px,4.5vw,64px)] font-extrabold text-balance">
              {t('faq.title')}
            </h2>
          </div>
          <div className="flex flex-col border-b-2 border-input-border">
            {faq.map(({ q, a }, index) => (
              <details
                key={q}
                open={index === 0}
                className="group border-t-2 border-input-border py-2"
              >
                <summary className="flex min-h-12 items-center justify-between gap-3 font-display text-2xl font-bold">
                  {q}
                  <span
                    aria-hidden="true"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-input-border text-lg transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-0 mb-3 max-w-2xl text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
