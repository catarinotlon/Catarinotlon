import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { setEventSettings, TEST_SETTINGS, uniqueEmail } from './support/database';
import {
  AFTER_SUBMIT,
  asAdmin,
  openReview,
  pageLoaded,
  signIn,
  signUp,
  uploadReceipt,
} from './support/flows';

test.describe('runner journey', () => {
  test.beforeEach(async () => {
    await setEventSettings(TEST_SETTINGS);
  });

  test('pays by transfer, gets confirmed by an admin, and downloads the ticket', async ({
    page,
    browser,
  }) => {
    const email = uniqueEmail('journey');
    const name = `Sofia ${email.slice(8, 14)}`;
    await signUp(page, email, name);
    await signIn(page, email);

    await expect(page).toHaveURL(/\/es\/pago/);
    await expect(page.getByText('002010077777777771')).toBeVisible();
    await expect(page.getByText('BENEFICIARIO DE PRUEBA').first()).toBeVisible();
    await expect(page.getByTestId('payment-total')).toHaveText('$100.00');
    await uploadReceipt(page);

    await asAdmin(browser, async (admin) => {
      await openReview(admin, name);
      await admin.getByRole('button', { name: 'Confirmar pago' }).click();
      await expect(admin.getByText('Pago confirmado')).toBeVisible();
    });

    await page.goto('/es/cuenta');
    await expect(page.getByRole('heading', { name: 'Tu boleto' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Código QR del boleto' })).toBeVisible();

    const pdf = await page.request.get(
      (await page.getByRole('link', { name: 'Descargar boleto (PDF)' }).getAttribute('href')) ?? '',
    );
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()['content-type']).toContain('application/pdf');
    expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
  });

  test('sees the reason after a rejection and can upload a new receipt', async ({
    page,
    browser,
  }) => {
    const email = uniqueEmail('rejected');
    const name = `Mateo ${email.slice(9, 15)}`;
    await signUp(page, email, name);
    await signIn(page, email);
    await uploadReceipt(page);

    await asAdmin(browser, async (admin) => {
      await openReview(admin, name);
      await admin.getByLabel(/Motivo del rechazo/).fill('El monto no coincide');
      await admin.getByRole('button', { name: 'Rechazar comprobante' }).click();
      await expect(admin.getByText('Comprobante rechazado')).toBeVisible();
    });

    await page.goto('/es/cuenta');
    await expect(page.getByText('No pudimos validar tu comprobante')).toBeVisible();
    await expect(page.getByText('El monto no coincide')).toBeVisible();
    await uploadReceipt(page);
  });

  test('adds another runner before paying, and one transfer covers both', async ({ page }) => {
    const email = uniqueEmail('family');
    await signUp(page, email);
    await signIn(page, email);

    await page.getByRole('link', { name: 'Agregar otro corredor antes de pagar' }).click();
    await page.getByLabel('Nombre completo del corredor').fill('Mateo Prueba');
    await page.getByLabel('Talla de playera').selectOption('TEST-S');
    await page.getByLabel('Nombre para tu playera').fill('Mateo');
    await page.getByRole('button', { name: 'Guardar y continuar al pago' }).click();

    await expect(page).toHaveURL(/\/es\/pago/);
    await expect(page.getByTestId('payment-total')).toHaveText('$200.00');
  });

  test('removes a runner added by mistake from the payment page', async ({ page }) => {
    const email = uniqueEmail('mistake');
    await signUp(page, email);
    await signIn(page, email);
    await page.getByRole('link', { name: 'Agregar otro corredor antes de pagar' }).click();
    await page.getByLabel('Nombre completo del corredor').fill('Mateo Prueba');
    await page.getByLabel('Talla de playera').selectOption('TEST-S');
    await page.getByLabel('Nombre para tu playera').fill('Mateo');
    await page.getByRole('button', { name: 'Guardar y continuar al pago' }).click();
    await expect(page.getByTestId('payment-total')).toHaveText('$200.00');

    await page.getByRole('button', { name: 'Quitar a Mateo Prueba' }).click();
    await page.getByRole('button', { name: 'Sí, quitar' }).click();

    await expect(page.getByTestId('payment-total')).toHaveText('$100.00', AFTER_SUBMIT);
    await expect(page.getByText('Mateo Prueba')).toHaveCount(0);
  });

  test('removes the selected unpaid runner from the account page', async ({ page }) => {
    const email = uniqueEmail('remove');
    await signUp(page, email);
    await signIn(page, email);
    await page.goto('/es/cuenta/corredores/nuevo');
    await page.getByLabel('Nombre completo del corredor').fill('Mateo Prueba');
    await page.getByLabel('Talla de playera').selectOption('TEST-S');
    await page.getByLabel('Nombre para tu playera').fill('Mateo');
    await page.getByRole('button', { name: 'Guardar y continuar al pago' }).click();
    await expect(page).toHaveURL(/\/es\/pago/);

    await page.goto('/es/cuenta');
    await page.getByRole('link', { name: /Mateo Prueba/ }).click();
    await expect(page.getByTestId('selected-runner')).toHaveText('Mateo Prueba');
    await page.getByRole('button', { name: 'Quitar a Mateo Prueba' }).click();
    await page.getByRole('button', { name: 'Sí, quitar' }).click();

    await expect(page).toHaveURL(/\/es\/cuenta$/, AFTER_SUBMIT);
    await expect(page.getByTestId('selected-runner')).toHaveText('Sofia Prueba');
    await expect(page.getByRole('link', { name: /Mateo Prueba/ })).toHaveCount(0);
  });

  test('keeps runners apart on the account page and edits the shirt name', async ({ page }) => {
    const email = uniqueEmail('account');
    await signUp(page, email);
    await signIn(page, email);
    await page.goto('/es/cuenta/corredores/nuevo');
    await page.getByLabel('Nombre completo del corredor').fill('Mateo Prueba');
    await page.getByLabel('Talla de playera').selectOption('TEST-S');
    await page.getByLabel('Nombre para tu playera').fill('Mateo');
    await page.getByRole('button', { name: 'Guardar y continuar al pago' }).click();
    await expect(page).toHaveURL(/\/es\/pago/);

    await page.goto('/es/cuenta');
    await page.getByRole('link', { name: /Mateo Prueba/ }).click();
    await expect(page.getByTestId('selected-runner')).toHaveText('Mateo Prueba');

    await page.getByLabel('Nombre en tu playera').fill('Teo');
    await page.getByRole('button', { name: 'Guardar nombre' }).click();
    await expect(page.getByRole('status')).toContainText('Guardamos');
    await page.reload();
    await expect(page.getByTestId('shirt-name')).toHaveText('TEO');
  });

  test('a runner cannot open the admin panel', async ({ page }) => {
    const email = uniqueEmail('intruder');
    await signUp(page, email);
    await signIn(page, email);

    const response = await page.goto('/es/admin');

    expect(response?.status()).toBe(404);
  });

  test('the header follows the session on every page', async ({ page, isMobile }) => {
    const email = uniqueEmail('header');
    await signUp(page, email);
    await signIn(page, email);
    const banner = page.getByRole('banner');

    for (const path of [
      '/es',
      '/es/pago',
      '/es/cuenta/corredores/nuevo',
      '/es/aviso-de-privacidad',
    ]) {
      await page.goto(path);
      await expect(banner.getByRole('link', { name: 'Iniciar sesión' })).toHaveCount(0);
      if (isMobile) {
        await banner.getByRole('button', { name: 'Abrir menú' }).click();
        const drawer = page.getByRole('dialog', { name: 'Menú' });
        await expect(drawer.getByRole('button', { name: /Mi cuenta/ })).toBeVisible();
        await expect(drawer.getByRole('link', { name: 'Iniciar sesión' })).toHaveCount(0);
        await page.keyboard.press('Escape');
      } else {
        await expect(banner.getByRole('button', { name: 'Menú de tu cuenta' })).toBeVisible();
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    }

    await page.goto('/es/cuenta');
    if (isMobile) {
      await banner.getByRole('button', { name: 'Abrir menú' }).click();
      await page
        .getByRole('dialog', { name: 'Menú' })
        .getByRole('button', { name: 'Cerrar sesión' })
        .click();
    } else {
      await banner.getByRole('button', { name: 'Menú de tu cuenta' }).click();
      await banner
        .getByRole('navigation', { name: 'Menú de tu cuenta' })
        .getByRole('button', { name: 'Cerrar sesión' })
        .click();
    }
    await expect(page).toHaveURL(/\/es$/);
    if (isMobile) await banner.getByRole('button', { name: 'Abrir menú' }).click();
    await expect(page.getByRole('banner').getByRole('link', { name: 'Inscríbete' })).toBeVisible();
  });

  test('the payment side cards stack without a gap', async ({ page, isMobile }) => {
    test.skip(isMobile, 'The side column only exists on wide screens.');
    const email = uniqueEmail('pay-layout');
    await signUp(page, email);
    await signIn(page, email);
    await expect(page).toHaveURL(/\/es\/pago/);
    const summary = await page
      .getByRole('heading', { name: 'Lo que vas a pagar' })
      .locator('xpath=ancestor::section[1]')
      .boundingBox();
    const contact = await page
      .getByRole('heading', { name: '¿Dudas con tu pago?' })
      .locator('xpath=ancestor::section[1]')
      .boundingBox();

    expect((contact?.y ?? 0) - ((summary?.y ?? 0) + (summary?.height ?? 0))).toBeLessThanOrEqual(
      32,
    );
  });

  test('signed-out visitors are sent to sign in', async ({ page }) => {
    await page.goto('/es/cuenta');

    await expect(page).toHaveURL(/iniciar-sesion/);
  });

  test('an admin marks a kit as delivered and can undo it', async ({ page, browser }) => {
    const email = uniqueEmail('kit');
    const name = `Kit ${email.slice(4, 10)}`;
    await signUp(page, email, name);
    await signIn(page, email);
    await uploadReceipt(page);

    await asAdmin(browser, async (admin) => {
      await openReview(admin, name);
      await admin.getByRole('button', { name: 'Confirmar pago' }).click();
      await expect(admin.getByText('Pago confirmado')).toBeVisible();

      await admin.goto('/es/admin/entrega-de-kits');
      await admin.getByLabel(/busca por nombre/i).fill(name);
      await admin.getByRole('button', { name: 'Buscar' }).click();
      await admin.getByRole('button', { name: 'Marcar kit entregado' }).click();
      await expect(admin.getByRole('heading', { name: 'Ya se entregó' })).toBeVisible();

      await admin.getByRole('button', { name: 'Deshacer entrega' }).click();
      await expect(admin.getByRole('button', { name: 'Marcar kit entregado' })).toBeVisible();
    });
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`the payment page has no accessibility violations in the ${theme} theme`, async ({
      page,
    }) => {
      await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
      const email = uniqueEmail(`a11y-${theme}`);
      await signUp(page, email);
      await signIn(page, email);
      await expect(page).toHaveURL(/\/es\/pago/);

      await pageLoaded(page);
      const results = await new AxeBuilder({ page }).analyze();

      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }
});
