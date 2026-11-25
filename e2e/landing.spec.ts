import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { EMPTY_SETTINGS, setEventSettings, TEST_SETTINGS, uniqueEmail } from './support/database';
import { pageLoaded, signIn, signUp } from './support/flows';

/** Switches to the dark theme from the header, or from the menu on phones. */
async function switchToDark(page: Page) {
  const banner = page.getByRole('banner');
  const menu = banner.getByRole('button', { name: 'Abrir menú' });
  if (await menu.isVisible()) {
    await menu.click();
    const drawer = page.getByRole('dialog', { name: 'Menú' });
    await drawer.locator('label', { has: page.getByRole('radio', { name: 'Oscuro' }) }).click();
    await page.keyboard.press('Escape');
    return;
  }
  await banner.getByRole('button', { name: 'Cambiar a tema oscuro' }).click();
}

test.describe('landing page', () => {
  test.beforeEach(async () => {
    await setEventSettings(EMPTY_SETTINGS);
  });

  test('the header controls never overlap', async ({ page, isMobile }) => {
    await page.goto('/es');
    const banner = page.getByRole('banner');
    const home = await banner.getByRole('link', { name: /ir al inicio/ }).boundingBox();
    const control = await banner
      .getByRole('button', { name: isMobile ? 'Abrir menú' : /Cambiar a tema/ })
      .boundingBox();

    expect(home).not.toBeNull();
    expect(control).not.toBeNull();
    expect((home?.x ?? 0) + (home?.width ?? 0)).toBeLessThanOrEqual(control?.x ?? 0);
  });

  test('a section link lands with the section right below the header', async ({ page }) => {
    await page.goto('/es');
    const banner = page.getByRole('banner');
    const menu = banner.getByRole('button', { name: 'Menú' });
    if (await menu.isVisible()) await menu.click();
    await banner.getByRole('link', { name: 'Kit del corredor' }).click();
    await expect(page).toHaveURL(/#kit$/);
    await expect
      .poll(async () => {
        const before = await page.evaluate(() => window.scrollY);
        await page.waitForTimeout(150);
        return before === (await page.evaluate(() => window.scrollY));
      })
      .toBe(true);

    const header = await banner.boundingBox();
    const section = await page.locator('#kit').boundingBox();
    const title = await page.locator('#kit h2').first().boundingBox();
    const headerBottom = (header?.y ?? 0) + (header?.height ?? 0);
    expect(header?.y ?? -1).toBeCloseTo(0, 0);
    expect(section?.y ?? Infinity).toBeLessThanOrEqual(headerBottom + 1);
    expect(title?.y ?? 0).toBeGreaterThanOrEqual(headerBottom);
    expect(title?.y ?? Infinity).toBeLessThanOrEqual(headerBottom + 80);
  });

  test('presents the event in Spanish by default', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/es$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Catarinotlón');
    await expect(
      page.getByRole('heading', { name: 'Dos distancias, una misma meta' }),
    ).toBeVisible();
  });

  test('never shows an invented event fact while settings are missing', async ({ page }) => {
    await page.goto('/es');

    await expect(page.getByText('Por confirmar').first()).toBeVisible();
    await expect(page.locator('body')).not.toContainText('[');
  });

  test('offers registering and signing in', async ({ page }) => {
    await page.goto('/es');

    await page.getByRole('link', { name: 'Inscríbete ahora' }).click();

    await expect(page).toHaveURL(/\/es\/crear-cuenta$/);
  });

  test('previews the shirt name as it is typed', async ({ page }) => {
    await page.goto('/es');

    await page.getByLabel('Escribe tu nombre o apodo').fill('Sofi');

    await expect(page.locator('#inscripcion').getByTestId('shirt-name')).toHaveText('SOFI');
  });

  test('switches the medals between distances', async ({ page }) => {
    await page.goto('/es');
    const medals = page.locator('#medallas');

    await medals.getByRole('radio', { name: '3K' }).check({ force: true });

    await expect(medals.getByRole('img', { name: /finalista 3K/ })).toBeVisible();
  });

  test('switches language and stays on the page', async ({ page }) => {
    await page.goto('/es');

    await page.getByRole('contentinfo').getByRole('link', { name: 'English' }).click();

    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(
      page.getByRole('heading', { name: 'Two distances, one finish line' }),
    ).toBeVisible();
  });

  test('starts light and remembers the dark theme across reloads', async ({ page }) => {
    await page.goto('/es');
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    await switchToDark(page);
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test.describe('on a device set to dark mode', () => {
    test.use({ colorScheme: 'dark' });

    test('a first visit is light and tells the browser not to darken it', async ({ page }) => {
      await page.goto('/es');
      const html = page.locator('html');

      await expect(html).not.toHaveClass(/dark/);
      // Chromium serializes "only light" as "light only".
      await expect(html).toHaveCSS('color-scheme', /^(only light|light only)$/);
      await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');

      await switchToDark(page);
      await expect(html).toHaveClass(/dark/);
      await expect(html).toHaveCSS('color-scheme', 'dark');
    });
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`has no accessibility violations in the ${theme} theme`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
      await page.goto('/es');

      await pageLoaded(page);
      const results = await new AxeBuilder({ page }).analyze();

      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }
});

for (const width of [320, 375, 390]) {
  test.describe(`header on a ${width} px phone`, () => {
    test.use({ viewport: { width, height: 700 } });
    test.beforeEach(async () => {
      await setEventSettings(TEST_SETTINGS);
    });

    test('signed in, the header controls never overlap or overflow', async ({ page }) => {
      const email = uniqueEmail('narrow');
      await signUp(page, email);
      await signIn(page, email);
      await page.goto('/es');

      const boxes = await page
        .getByRole('banner')
        .locator('a, button')
        .evaluateAll((elements) =>
          elements
            .map((element) => element.getBoundingClientRect())
            .filter((box) => box.width > 0 && box.height > 0)
            .map((box) => ({ left: box.left, right: box.right, top: box.top, bottom: box.bottom })),
        );
      expect(boxes.length).toBeGreaterThanOrEqual(2);
      for (const box of boxes) expect(box.right).toBeLessThanOrEqual(width);
      for (const [index, a] of boxes.entries()) {
        for (const b of boxes.slice(index + 1)) {
          const overlap =
            a.left < b.right - 1 &&
            b.left < a.right - 1 &&
            a.top < b.bottom - 1 &&
            b.top < a.bottom - 1;
          expect(overlap).toBe(false);
        }
      }
    });
  });
}
