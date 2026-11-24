import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { EMPTY_SETTINGS, setEventSettings, TEST_SETTINGS } from './support/database';
import { asAdmin, pageLoaded, PASSWORD } from './support/flows';

test.describe('admin event settings', () => {
  test.beforeEach(async () => {
    await setEventSettings(TEST_SETTINGS);
  });

  test('a saved price appears on the site with no deploy', async ({ page, browser }) => {
    await asAdmin(browser, async (admin) => {
      await admin.goto('/es/admin/configuracion');
      await admin.getByLabel('Precio (igual para 3K y 5K)').fill('432.10');
      await admin.getByRole('button', { name: 'Guardar inscripción' }).click();
      await expect(admin.getByRole('main').getByRole('status').last()).toContainText('Guardamos');
    });

    await page.goto('/es');

    await expect(page.locator('#distancias').getByText('$432.10').first()).toBeVisible();
  });

  test('changing the bank data requires the correct password', async ({ browser }) => {
    await asAdmin(browser, async (admin) => {
      await admin.goto('/es/admin/configuracion');
      const bank = admin.locator('form', { hasText: 'Protegido' });
      await bank.getByRole('button', { name: 'Cambiar datos de pago' }).click();
      await bank.getByLabel('Banco').fill('OTRO BANCO DE PRUEBA');

      await bank.getByRole('button', { name: 'Guardar datos de pago' }).click();
      await expect(bank.getByRole('alert')).toContainText('Escribe tu contraseña');

      await bank.getByLabel(/Tu contraseña/).fill('wrong-password');
      await bank.getByRole('button', { name: 'Guardar datos de pago' }).click();
      await expect(bank.getByRole('alert')).toContainText('La contraseña no es correcta');

      await bank.getByLabel(/Tu contraseña/).fill(PASSWORD);
      await bank.getByRole('button', { name: 'Guardar datos de pago' }).click();
      await expect(bank.getByRole('status')).toContainText('Guardamos');
    });
  });

  test('refuses a CLABE with a wrong check digit', async ({ browser }) => {
    await asAdmin(browser, async (admin) => {
      await admin.goto('/es/admin/configuracion');
      const bank = admin.locator('form', { hasText: 'Protegido' });
      await bank.getByRole('button', { name: 'Cambiar datos de pago' }).click();
      await bank.getByLabel('CLABE (18 dígitos)').fill('002010077777777772');
      await bank.getByLabel(/Tu contraseña/).fill(PASSWORD);

      await bank.getByRole('button', { name: 'Guardar datos de pago' }).click();

      await expect(bank.getByRole('alert')).toContainText('dígito verificador');
    });
  });

  test('with the fee missing, the site says registration opens soon', async ({ page }) => {
    await setEventSettings({ ...TEST_SETTINGS, feeCents: null });

    await page.goto('/es');

    await expect(page.getByText('Inscripciones próximamente').first()).toBeVisible();
  });

  test('registers a walk-in runner with the payment already received', async ({ browser }) => {
    const name = `Walkin ${Date.now()}`;
    await asAdmin(browser, async (admin) => {
      await admin.goto('/es/admin/inscripciones/nueva');
      await admin.getByLabel('Nombre completo del corredor').fill(name);
      await admin.getByLabel('Talla de playera').selectOption('TEST-M');
      await admin.getByLabel('Nombre para la playera').fill('Walkin');
      await admin.getByRole('checkbox', { name: /Ya recibí el pago/ }).check();
      await admin.getByRole('button', { name: 'Inscribir corredor' }).click();

      await expect(admin).toHaveURL(/\/es\/admin$/);
      await admin.getByLabel(/Buscar/).fill(name);
      await admin.getByRole('button', { name: 'Buscar' }).click();
      await expect(admin.getByRole('row', { name: new RegExp(name) })).toContainText('Pagado');
    });
  });

  test('exports registrations as CSV for admins only', async ({ page, browser }) => {
    const anonymous = await page.request.get('/api/admin/exports/registrations');
    expect(anonymous.status()).toBe(404);

    await asAdmin(browser, async (admin) => {
      const response = await admin.request.get('/api/admin/exports/shirts');

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('text/csv');
      expect(await response.text()).toContain('Nombre en playera');
    });
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`the admin pages have no accessibility violations in ${theme}`, async ({ browser }) => {
      await asAdmin(browser, async (admin) => {
        await admin.addInitScript((value) => localStorage.setItem('theme', value), theme);
        for (const path of [
          '/es/admin',
          '/es/admin/configuracion',
          '/es/admin/entrega-de-kits',
          '/es/admin/inscripciones/nueva',
        ]) {
          await admin.goto(path);
          await pageLoaded(admin);
          const results = await new AxeBuilder({ page: admin }).analyze();
          expect(results.violations.map((violation) => `${path}:${violation.id}`)).toEqual([]);
        }
      });
    });
  }

  test.afterAll(async () => {
    await setEventSettings(EMPTY_SETTINGS);
  });
});
