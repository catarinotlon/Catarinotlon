import { expect, type Browser, type Page } from '@playwright/test';

import { verifyEmail } from './database';

export const PASSWORD = 'correct-horse-battery';
const ADMIN_EMAIL = 'admin@e2e.test';
/**
 * Signing up or in hashes the password on the server, which is CPU-bound and slows down when the
 * machine is busy. The redirect that follows gets the same margin as any other action.
 */
export const AFTER_SUBMIT = { timeout: 15_000 };
const RECEIPT = {
  name: 'comprobante.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4 test receipt'),
};

export async function signUp(page: Page, email: string, name = 'Sofia Prueba') {
  await page.goto('/es/crear-cuenta');
  await page.getByLabel('Nombre completo').fill(name);
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Teléfono').fill('5500000000');
  await page.getByLabel('Talla de playera').selectOption('TEST-M');
  await page.getByLabel('Nombre para tu playera').fill('Sofi');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Crear cuenta e inscribirme/ }).click();
  await expect(page).toHaveURL(/confirma-tu-correo/, AFTER_SUBMIT);
  await verifyEmail(email);
}

export async function signIn(page: Page, email: string) {
  await page.goto('/es/iniciar-sesion');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).not.toHaveURL(/iniciar-sesion/, AFTER_SUBMIT);
}

export async function uploadReceipt(page: Page) {
  await page.getByLabel(/Comprobante de tu Transferencia \(SPEI\)/).setInputFiles(RECEIPT);
  await page.getByRole('button', { name: 'Enviar comprobante' }).click();
  await expect(page.getByRole('heading', { name: 'Estamos validando tu pago' })).toBeVisible();
}

export async function asAdmin<T>(browser: Browser, work: (page: Page) => Promise<T>): Promise<T> {
  const context = await browser.newContext({ locale: 'es-MX' });
  const page = await context.newPage();
  try {
    await page.goto('/es/iniciar-sesion');
    await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL);
    await page.getByLabel('Contraseña').fill(PASSWORD);
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    const signInError = page.getByRole('main').getByRole('alert');
    await expect
      .poll(
        async () => !page.url().includes('iniciar-sesion') || (await signInError.count()) > 0,
        AFTER_SUBMIT,
      )
      .toBe(true);
    if (page.url().includes('iniciar-sesion')) {
      await page.goto('/es/crear-cuenta');
      await page.getByLabel('Nombre completo').fill('Admin Prueba');
      await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL);
      await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
      await page.getByLabel('Teléfono').fill('5500000000');
      await page.getByLabel('Talla de playera').selectOption('TEST-S');
      await page.getByLabel('Nombre para tu playera').fill('Admin');
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: /Crear cuenta e inscribirme/ }).click();
      await expect(page).toHaveURL(/confirma-tu-correo/, AFTER_SUBMIT);
      await verifyEmail(ADMIN_EMAIL);
      await page.goto('/es/iniciar-sesion');
      await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL);
      await page.getByLabel('Contraseña').fill(PASSWORD);
      await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
      await expect(page).not.toHaveURL(/iniciar-sesion/, AFTER_SUBMIT);
    }
    return await work(page);
  } finally {
    await context.close();
  }
}

export async function openReview(page: Page, runnerName: string) {
  await page.goto('/es/admin');
  await page.getByLabel(/Buscar/).fill(runnerName);
  await page.getByRole('button', { name: 'Buscar' }).click();
  await page.getByRole('link', { name: `Revisar pago de ${runnerName}` }).click();
  await expect(page.getByRole('heading', { name: 'Revisar pago' })).toBeVisible();
}

/** Waits until the page has replaced its loading skeleton with content. */
export async function pageLoaded(page: Page): Promise<void> {
  await expect(page.locator('[role="status"][aria-busy="true"]')).toHaveCount(0);
}
