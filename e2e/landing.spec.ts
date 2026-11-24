import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { EMPTY_SETTINGS, setEventSettings } from './support/database';

test.describe('landing page', () => {
  test.beforeEach(async () => {
    await setEventSettings(EMPTY_SETTINGS);
  });

  test('the header controls never overlap', async ({ page }) => {
    await page.goto('/es');
    const banner = page.getByRole('banner');
    const home = await banner.getByRole('link', { name: /ir al inicio/ }).boundingBox();
    const theme = await banner.getByRole('button', { name: /Cambiar a tema/ }).boundingBox();

    expect(home).not.toBeNull();
    expect(theme).not.toBeNull();
    expect((home?.x ?? 0) + (home?.width ?? 0)).toBeLessThanOrEqual(theme?.x ?? 0);
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

    await page.getByRole('button', { name: 'Cambiar a tema oscuro' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`has no accessibility violations in the ${theme} theme`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
      await page.goto('/es');

      const results = await new AxeBuilder({ page }).analyze();

      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }
});
