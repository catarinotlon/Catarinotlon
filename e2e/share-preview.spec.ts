import { expect, test, type APIRequestContext } from '@playwright/test';

/**
 * Social networks read the page as a crawler, so metadata is fetched with a crawler user agent:
 * Next.js puts it in the `<head>` for them instead of streaming it.
 */
const CRAWLER = { 'user-agent': 'facebookexternalhit/1.1' };

const LOCALES = [
  {
    path: '/es',
    title: 'Catarinotlón 2026 · Carrera 3K y 5K',
    description:
      'Elige 3K o 5K, corre con tu nombre en la espalda y cruza la meta por tu medalla de catarina.',
    ogLocale: 'es_MX',
    alt: /Nos vemos en el Catarinotlón/,
  },
  {
    path: '/en',
    title: 'Catarinotlón 2026 · 3K and 5K race',
    description:
      'Pick 3K or 5K, run with your name on your back, and cross the finish line for your ladybug medal.',
    ogLocale: 'en_US',
    alt: /See you at the Catarinotlón/,
  },
] as const;

async function headTags(request: APIRequestContext, path: string) {
  const response = await request.get(path, { headers: CRAWLER });
  expect(response.ok()).toBe(true);
  const html = await response.text();
  const head = html.slice(0, html.indexOf('</head>'));
  const tags = new Map<string, string>();
  for (const match of head.matchAll(/<meta\s+(?:property|name)="([^"]+)"\s+content="([^"]*)"/g)) {
    const [, key, value] = match;
    if (key && value !== undefined && !tags.has(key)) tags.set(key, decode(value));
  }
  return tags;
}

function decode(value: string) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#x27;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

/** Width and height from a PNG's IHDR chunk. */
function pngSize(bytes: Buffer) {
  expect(bytes.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

test.describe('share preview', () => {
  test.skip(({ isMobile }) => isMobile, 'Crawlers do not depend on the viewport.');

  for (const locale of LOCALES) {
    test(`the ${locale.path} landing describes the event to social networks`, async ({
      request,
      baseURL,
    }) => {
      const tags = await headTags(request, locale.path);

      expect(tags.get('og:title')).toBe(locale.title);
      expect(tags.get('og:description')).toBe(locale.description);
      expect(tags.get('og:site_name')).toBe('Catarinotlón');
      expect(tags.get('og:locale')).toBe(locale.ogLocale);
      expect(tags.get('og:type')).toBe('website');
      expect(tags.get('og:image:width')).toBe('1200');
      expect(tags.get('og:image:height')).toBe('630');
      expect(tags.get('og:image:alt')).toMatch(locale.alt);
      expect(tags.get('og:image')).toMatch(new RegExp(`^${baseURL}${locale.path}/opengraph-image`));
      expect(tags.get('twitter:card')).toBe('summary_large_image');
      expect(tags.get('twitter:title')).toBe(locale.title);
      expect(tags.get('twitter:image')).toBe(tags.get('og:image'));
    });

    test(`the ${locale.path} share image is a 1200 × 630 PNG`, async ({ request }) => {
      const tags = await headTags(request, locale.path);
      const image = await request.get(tags.get('og:image') ?? '');

      expect(image.status()).toBe(200);
      expect(image.headers()['content-type']).toBe('image/png');
      expect(pngSize(await image.body())).toEqual({ width: 1200, height: 630 });
    });
  }

  test('a page shared from inside the site shows the same event card', async ({ request }) => {
    const landing = await headTags(request, '/es');
    const signUp = await headTags(request, '/es/crear-cuenta');

    expect(landing.get('og:image')).toBeTruthy();
    expect(signUp.get('og:title')).toBe(landing.get('og:title'));
    expect(signUp.get('og:image')).toBe(landing.get('og:image'));
  });
});
