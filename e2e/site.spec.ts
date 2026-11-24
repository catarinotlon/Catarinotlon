import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { EMPTY_SETTINGS, setEventSettings, TEST_SETTINGS } from './support/database';
import { pageLoaded } from './support/flows';

test.describe('default language', () => {
  test.use({ locale: 'en-US' });

  test('a first visit is in Spanish on an English browser and a chosen language is remembered', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/es$/);

    await page.getByRole('contentinfo').getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/en$/);

    await page.goto('/');
    await expect(page).toHaveURL(/\/en$/);
  });
});

test.describe('legal and status pages', () => {
  test('the terms follow the event settings as soon as the organizer saves them', async ({
    page,
  }) => {
    await setEventSettings(EMPTY_SETTINGS);
    await page.goto('/es/terminos-y-condiciones');
    await expect(page.getByText(/Se realizará el \[FECHA DEL EVENTO\] en \[SEDE\]/)).toBeVisible();

    await setEventSettings(TEST_SETTINGS);
    await page.reload();
    await expect(
      page.getByText(/Se realizará el 15 de enero de 2030 en SEDE DE PRUEBA/),
    ).toBeVisible();
    await expect(page.getByText(/la misma para 3K y para 5K: \$100\.00/)).toBeVisible();
  });

  test('the privacy notice is linked from the footer and marked as a draft', async ({ page }) => {
    await page.goto('/es');

    await page.getByRole('contentinfo').getByRole('link', { name: 'Aviso de privacidad' }).click();

    await expect(page).toHaveURL(/\/es\/aviso-de-privacidad$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Aviso de privacidad');
    await expect(page.getByText('Borrador · pendiente de revisión legal')).toBeVisible();
  });

  test('the terms switch language on the same page', async ({ page }) => {
    await page.goto('/es/terminos-y-condiciones');

    await page.getByRole('contentinfo').getByRole('link', { name: 'English' }).click();

    await expect(page).toHaveURL(/\/en\/terms$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Terms and conditions');
  });

  test('an unknown page shows the localized 404', async ({ page }) => {
    const response = await page.goto('/es/esta-pagina-no-existe');

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Te saliste de la ruta' })).toBeVisible();
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`legal and 404 pages have no accessibility violations in ${theme}`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('theme', value), theme);

      for (const path of ['/es/aviso-de-privacidad', '/en/terms', '/es/no-existe']) {
        await page.goto(path);
        // Next.js streams the metadata of dynamic pages, so wait for the title.
        await expect(page).toHaveTitle(/Catarinotlón/);
        await pageLoaded(page);
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations.map((violation) => violation.id)).toEqual([]);
      }
    });
  }
});
