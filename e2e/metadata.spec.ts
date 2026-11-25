import { expect, test } from '@playwright/test';

test.describe('metadata', () => {
  test.skip(({ isMobile }) => isMobile, 'Metadata does not depend on the viewport.');

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
});
