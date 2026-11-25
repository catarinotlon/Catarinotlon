import type { CSSProperties, ReactNode } from 'react';

/** The size, in pixels, social networks expect for a shared link's image (1.91:1). */
export const SHARE_CARD_SIZE = { width: 1200, height: 630 } as const;

/**
 * Brand colors, written out because the card is rendered to a PNG by Satori, which does not
 * resolve CSS variables. Like the emails, the card is light only.
 */
const BRAND = {
  red: '#D42016',
  ink: '#121212',
  white: '#FFFFFF',
  mutedText: '#4A4A4E',
  shirtInk: '#1A1A1A',
  dots: 'rgba(18, 18, 18, 0.9)',
} as const;

const DISPLAY: CSSProperties = {
  fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif",
  fontStyle: 'italic',
  fontWeight: 900,
  textTransform: 'uppercase',
};

// Same proportions as ShirtPreview, so the name sits where it is printed on the shirt.
const SHIRT = { width: 360, height: 528, offset: -8 } as const;
const SHIRT_NAME_MAX_FONT_RATIO = 0.116;
const SHIRT_NAME_FIT = 0.94;

/** Props of {@link ShareCard}. */
export interface ShareCardProps {
  /** Small line next to the ladybug, for example "Carrera 3K y 5K · 2026". */
  eyebrow: ReactNode;
  /** The big headline. Wrap the words to stress in {@link ShareCardAccent}. */
  headline: ReactNode;
  /** What every runner takes home, for example "Playera personalizada + medalla". */
  perks: string;
  /** The race distances, shown as chips. */
  distances: readonly string[];
  /** The name printed on the shirt, uppercase on render. */
  shirtName: string;
  /** Source of the back-of-shirt photo without a name. */
  shirtSrc: string;
  /** Source of the finisher medal image. */
  medalSrc: string;
}

/**
 * Marks words in the eyebrow or headline in brand red.
 *
 * @param props - The words to stress.
 * @returns The stressed words.
 */
export function ShareCardAccent({ children }: { children: ReactNode }) {
  return <span style={{ color: BRAND.red }}>{children}</span>;
}

/**
 * The image social networks show when a link to the site is shared: the event, the headline,
 * the distances, and the shirt with the finisher medal over the red dotted ribbon.
 *
 * @remarks
 * Rendered to a PNG with `ImageResponse`, so it uses only what Satori supports: flexbox,
 * absolute positioning, and inline styles with fixed colors. It carries no personal data and no
 * event fact that is still pending configuration (date, venue, fee).
 *
 * @param props - The translated copy and the image sources.
 * @returns The 1200 × 630 card.
 */
export function ShareCard({
  eyebrow,
  headline,
  perks,
  distances,
  shirtName,
  shirtSrc,
  medalSrc,
}: ShareCardProps) {
  const printed = shirtName.toLocaleUpperCase();
  const nameRatio = Math.min(
    SHIRT_NAME_MAX_FONT_RATIO,
    SHIRT_NAME_FIT / Math.max(printed.length, 1),
  );

  return (
    <div
      data-testid="share-card"
      style={{
        ...SHARE_CARD_SIZE,
        display: 'flex',
        flexShrink: 0,
        overflow: 'hidden',
        backgroundColor: BRAND.white,
        color: BRAND.ink,
        fontFamily: "'Barlow', 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: 640,
          padding: '56px 40px 52px 64px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Ladybug />
          <div
            style={{ ...DISPLAY, display: 'flex', columnGap: 10, fontSize: 40, lineHeight: 0.95 }}
          >
            {eyebrow}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div
            style={{
              ...DISPLAY,
              display: 'flex',
              flexWrap: 'wrap',
              columnGap: 22,
              fontSize: 84,
              lineHeight: 0.9,
            }}
          >
            {headline}
          </div>
          <Route />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {distances.map((distance, index) => (
            <span
              key={distance}
              style={{
                ...DISPLAY,
                display: 'flex',
                alignItems: 'center',
                height: 48,
                padding: '0 18px',
                borderRadius: 999,
                backgroundColor: index === 0 ? BRAND.red : BRAND.ink,
                color: BRAND.white,
                fontSize: 28,
              }}
            >
              {distance}
            </span>
          ))}
          <span
            style={{
              marginLeft: 6,
              fontSize: 22,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              color: BRAND.mutedText,
            }}
          >
            {perks}
          </span>
        </div>
      </div>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexGrow: 1,
          overflow: 'hidden',
          backgroundColor: BRAND.red,
        }}
      >
        <RibbonDots />
        <div
          style={{
            position: 'absolute',
            left: 52,
            top: 48,
            width: SHIRT.width,
            height: 470,
            display: 'flex',
            borderRadius: 24,
            overflow: 'hidden',
            backgroundColor: '#EDEDEF',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.35)',
            transform: 'rotate(-3deg)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser */}
          <img
            src={shirtSrc}
            alt=""
            width={SHIRT.width}
            height={SHIRT.height}
            style={{ position: 'absolute', left: 0, top: SHIRT.offset, objectFit: 'cover' }}
          />
          <div
            data-testid="share-card-shirt-name"
            style={{
              ...DISPLAY,
              position: 'absolute',
              left: 0,
              top: SHIRT.offset + SHIRT.height * 0.172,
              width: SHIRT.width,
              height: SHIRT.height * 0.078,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
              color: BRAND.shirtInk,
              fontSize: SHIRT.width * nameRatio,
            }}
          >
            {printed}
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser */}
        <img
          src={medalSrc}
          alt=""
          width={236}
          height={596}
          style={{
            position: 'absolute',
            right: 18,
            top: -230,
            objectFit: 'contain',
            transform: 'rotate(8deg)',
          }}
        />
      </div>
    </div>
  );
}

/** The Catarinotlón ladybug mark with speed lines, light version. */
function Ladybug() {
  return (
    <svg width={84} height={45} viewBox="0 0 120 64" fill="none" aria-hidden="true">
      <path d="M6 20h24M10 44h20" stroke={BRAND.ink} strokeWidth={4} strokeLinecap="round" />
      <path d="M2 32h20" stroke={BRAND.red} strokeWidth={4} strokeLinecap="round" />
      <path d="M100 24l11-9M100 40l11 9" stroke={BRAND.ink} strokeWidth={3} strokeLinecap="round" />
      <ellipse cx={96} cy={32} rx={9} ry={13} fill={BRAND.ink} />
      <circle cx={68} cy={32} r={26} fill={BRAND.red} />
      <path d="M42 32h52" stroke={BRAND.ink} strokeWidth={3} />
      <circle cx={58} cy={20} r={5} fill={BRAND.ink} />
      <circle cx={78} cy={20} r={5} fill={BRAND.ink} />
      <circle cx={58} cy={44} r={5} fill={BRAND.ink} />
      <circle cx={78} cy={44} r={5} fill={BRAND.ink} />
    </svg>
  );
}

const RIBBON = { width: 560, height: 630, spacing: 40, radius: 6 } as const;
const RIBBON_DOTS = Array.from(
  { length: (RIBBON.width / RIBBON.spacing) * (RIBBON.height / RIBBON.spacing + 1) },
  (_, index) => {
    const columns = RIBBON.width / RIBBON.spacing;
    return {
      cx: RIBBON.spacing / 2 + (index % columns) * RIBBON.spacing,
      cy: RIBBON.spacing / 2 + Math.floor(index / columns) * RIBBON.spacing,
    };
  },
);

/**
 * Black dots on red, like the medal ribbon. Drawn as SVG circles because Satori does not repeat
 * a CSS background pattern.
 */
function RibbonDots() {
  return (
    <svg
      width={RIBBON.width}
      height={RIBBON.height}
      viewBox={`0 0 ${RIBBON.width} ${RIBBON.height}`}
      aria-hidden="true"
      style={{ position: 'absolute', left: 0, top: 0 }}
    >
      {RIBBON_DOTS.map(({ cx, cy }) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={RIBBON.radius} fill={BRAND.dots} />
      ))}
    </svg>
  );
}

/** The dotted route that ends in the ladybug pin, a brand motif. */
function Route() {
  return (
    <svg width={460} height={24} viewBox="0 0 460 24" fill="none" aria-hidden="true">
      <path
        d="M4 12H420"
        stroke={BRAND.red}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray="0 16"
      />
      <circle cx={444} cy={12} r={10} fill={BRAND.red} />
      <circle cx={441} cy={9} r={2.5} fill={BRAND.ink} />
      <circle cx={448} cy={15} r={2.5} fill={BRAND.ink} />
    </svg>
  );
}
