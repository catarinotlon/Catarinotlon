import { expect, test } from '@playwright/test';

/** Every directive that asks crawlers and AI tools to leave the site alone. */
const BLOCKED = ['noindex', 'nofollow', 'noarchive', 'nosnippet', 'noimageindex'] as const;

test.describe('metadata', () => {
  test.skip(({ isMobile }) => isMobile, 'Metadata does not depend on the viewport.');

  test('every page names its tab after the page first and the event last', async ({ page }) => {
    await page.goto('/es/iniciar-sesion');
    await expect(page).toHaveTitle('Inicia sesión · Catarinotlón');

    await page.goto('/en/privacy');
    await expect(page).toHaveTitle('Privacy notice · Catarinotlón');

    await page.goto('/es');
    await expect(page).toHaveTitle('Catarinotlón 2026 · Carrera 3K y 5K');
  });

  test('the icons and the manifest load', async ({ page, request }) => {
    await page.goto('/es/iniciar-sesion');
    await expect(page).toHaveTitle(/Catarinotlón/);

    const hrefs = await Promise.all(
      [
        'link[rel="icon"][type="image/svg+xml"]',
        'link[rel="icon"][href^="/favicon.ico"]',
        'link[rel="apple-touch-icon"]',
        'link[rel="manifest"]',
      ].map((selector) => page.locator(selector).first().getAttribute('href')),
    );
    for (const href of hrefs) {
      expect(href).toBeTruthy();
      expect((await request.get(href ?? '')).ok(), href ?? '').toBe(true);
    }

    const manifest = (await (await request.get('/manifest.webmanifest')).json()) as {
      icons: { src: string; sizes: string; purpose?: string }[];
    };
    expect(manifest).toMatchObject({
      name: 'Catarinotlón 2026',
      short_name: 'Catarinotlón',
      start_url: '/',
      display: 'standalone',
    });
    for (const icon of manifest.icons) {
      expect((await request.get(icon.src)).ok(), icon.src).toBe(true);
    }
  });

  test('iOS does not turn the CLABE or a bib number into a phone link', async ({ page }) => {
    await page.goto('/es');
    await expect(page.locator('meta[name="format-detection"]')).toHaveAttribute(
      'content',
      'telephone=no',
    );
  });

  test('the browser bar follows the theme the runner chose', async ({ page }) => {
    await page.goto('/es');
    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute('content', '#ffffff');

    await page.getByRole('button', { name: 'Cambiar a tema oscuro' }).click();
    await expect(themeColor).toHaveAttribute('content', '#0e0e0f');

    await page.reload();
    await expect(themeColor).toHaveAttribute('content', '#0e0e0f');

    await page.getByRole('link', { name: 'Iniciar sesión', exact: true }).first().click();
    await expect(page).toHaveURL(/\/es\/iniciar-sesion$/);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0e0e0f');
  });

  test('every page asks crawlers not to index, follow, or train on it', async ({ page }) => {
    for (const path of ['/es', '/en/sign-in', '/es/nueva-contrasena']) {
      const response = await page.goto(path);
      const header = response?.headers()['x-robots-tag'] ?? '';
      for (const directive of [...BLOCKED, 'noai', 'noimageai']) {
        expect(header, `${path} X-Robots-Tag`).toContain(directive);
      }
      const meta = page.locator('meta[name="robots"]');
      await expect(meta).toHaveCount(1);
      for (const directive of BLOCKED) {
        await expect(meta, `${path} robots meta`).toHaveAttribute(
          'content',
          new RegExp(`\\b${directive}\\b`),
        );
      }
    }
  });

  test('robots.txt keeps every crawler out except link previews', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.ok()).toBe(true);
    const robots = await response.text();

    expect(robots).toMatch(/User-Agent: \*\nDisallow: \/\n/);
    expect(robots).toContain('User-Agent: Twitterbot');
    expect(robots).toContain('User-Agent: facebookexternalhit');
    expect(robots).not.toContain('Sitemap');
  });
});
