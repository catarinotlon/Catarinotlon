import { expect, test, type Page } from '@playwright/test';

import {
  acceptancesOf,
  EMPTY_SETTINGS,
  registrationsOf,
  setEventSettings,
  TEST_SETTINGS,
  uniqueEmail,
  verifyEmail,
} from './support/database';

const PASSWORD = 'correct-horse-battery';

async function fillSignUp(page: Page, email: string) {
  await page.getByLabel('Nombre completo').fill('Runner Prueba');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Teléfono').fill('5500000000');
  await page.getByRole('radio', { name: '3K' }).check({ force: true });
  await page.getByLabel('Talla de playera').selectOption('TEST-M');
  await page.getByLabel('Nombre para tu playera').fill('Runner');
  await page.getByRole('checkbox').check();
}

test.describe('sign up', () => {
  test.beforeEach(async () => {
    await setEventSettings(TEST_SETTINGS);
  });

  test('creates the account and a pending registration in one form', async ({ page }) => {
    const email = uniqueEmail('signup');
    await page.goto('/es/crear-cuenta');

    await fillSignUp(page, email);
    await expect(page.getByTestId('shirt-name')).toHaveText('RUNNER');
    await page.getByRole('button', { name: /Crear cuenta e inscribirme · 3K/ }).click();

    await expect(page).toHaveURL(/\/es\/confirma-tu-correo/);
    await expect(page.getByRole('heading', { name: 'Confirma tu correo' })).toBeVisible();
    expect(await registrationsOf(email)).toMatchObject([
      {
        runner_name: 'Runner Prueba',
        status: 'pending_payment',
        distance: '3K',
        shirt_name: 'Runner',
        fee_cents: 10000,
      },
    ]);
    expect(await acceptancesOf(email)).toHaveLength(1);
  });

  test('cannot sign in until the email is confirmed, and then can', async ({ page }) => {
    const email = uniqueEmail('verify');
    await page.goto('/es/crear-cuenta');
    await fillSignUp(page, email);
    await page.getByRole('button', { name: /Crear cuenta e inscribirme/ }).click();
    await expect(page).toHaveURL(/confirma-tu-correo/);

    await page.goto('/es/iniciar-sesion');
    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByLabel('Contraseña').fill(PASSWORD);
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText('Confirma tu correo');

    await verifyEmail(email);
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(page).toHaveURL(/\/es\/(pago|cuenta)/);
  });

  test('shows validation errors without creating anything', async ({ page }) => {
    const email = uniqueEmail('invalid');
    await page.goto('/es/crear-cuenta');

    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByRole('button', { name: /Crear cuenta e inscribirme/ }).click();

    await expect(page.getByText('Debes aceptar los términos').first()).toBeVisible();
    await expect(page).toHaveURL(/crear-cuenta/);
    expect(await registrationsOf(email)).toEqual([]);
  });

  test('does not reveal an existing email and adds no registration', async ({ page }) => {
    const email = uniqueEmail('taken');
    await page.goto('/es/crear-cuenta');
    await fillSignUp(page, email);
    await page.getByRole('button', { name: /Crear cuenta e inscribirme/ }).click();
    await expect(page).toHaveURL(/confirma-tu-correo/);

    await page.goto('/es/crear-cuenta');
    await fillSignUp(page, email);
    await page.getByRole('button', { name: /Crear cuenta e inscribirme/ }).click();

    await expect(page).toHaveURL(/confirma-tu-correo/);
    expect(await registrationsOf(email)).toHaveLength(1);
  });

  test('never reveals whether an email has an account on password reset', async ({ page }) => {
    await page.goto('/es/olvide-mi-contrasena');
    await page.getByLabel('Correo electrónico').fill(uniqueEmail('nobody'));

    await page.getByRole('button', { name: 'Enviar enlace' }).click();

    await expect(page.getByRole('heading', { name: 'Revisa tu correo' })).toBeVisible();
  });
});

test.describe('sign up while registration is closed', () => {
  test('creates the account but asks no race details', async ({ page }) => {
    await setEventSettings(EMPTY_SETTINGS);
    await page.goto('/es/crear-cuenta');

    await expect(page.getByText('Inscripciones próximamente')).toBeVisible();
    await expect(page.getByLabel('Talla de playera')).toHaveCount(0);
  });
});
