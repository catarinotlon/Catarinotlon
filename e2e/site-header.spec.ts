import { expect, test } from '@playwright/test';

import { setEventSettings, TEST_SETTINGS, uniqueEmail } from './support/database';
import { signIn, signUp } from './support/flows';

test.describe('site header', () => {
  test('every page offers the landing navigation and the account actions', async ({
    page,
    isMobile,
  }) => {
    for (const path of ['/es/crear-cuenta', '/es/iniciar-sesion', '/es/aviso-de-privacidad']) {
      await page.goto(path);
      const banner = page.getByRole('banner');
      if (isMobile) await banner.getByRole('button', { name: 'Abrir menú' }).click();
      const nav = banner.getByRole('navigation', {
        name: isMobile ? 'Menú' : 'Navegación principal',
      });

      await expect(nav.getByRole('link', { name: 'Kit del corredor' })).toHaveAttribute(
        'href',
        '/es#kit',
      );
      const account = isMobile ? nav : banner;
      await expect(account.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();
      await expect(account.getByRole('link', { name: 'Inscríbete' })).toBeVisible();
    }
  });

  test('a signed-in runner opens the account menu from the avatar and signs out', async ({
    page,
    isMobile,
  }) => {
    await setEventSettings(TEST_SETTINGS);
    const email = uniqueEmail('avatar-menu');
    await signUp(page, email);
    await signIn(page, email);
    await page.goto('/es/pago');
    const banner = page.getByRole('banner');
    await expect(banner.getByRole('button', { name: 'Cerrar sesión' })).toHaveCount(0);

    await banner.getByRole('button', { name: 'Menú de tu cuenta' }).click();
    const menu = banner.getByRole('navigation', { name: 'Menú de tu cuenta' });
    await expect(menu.getByRole('link', { name: 'Mi cuenta' })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Agregar otro corredor' })).toBeVisible();
    await menu.getByRole('button', { name: 'Cerrar sesión' }).click();

    await expect(page).toHaveURL(/\/es$/);
    if (isMobile) await banner.getByRole('button', { name: 'Abrir menú' }).click();
    await expect(banner.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();
  });
});
