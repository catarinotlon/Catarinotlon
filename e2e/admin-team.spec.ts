import { expect, test, type Page } from '@playwright/test';

import { setEventSettings, TEST_SETTINGS, uniqueEmail } from './support/database';
import { asAdmin, signIn, signUp } from './support/flows';

const adminNav = (page: Page) => page.getByRole('navigation', { name: 'Administración' });

async function openAdminFromLanding(page: Page) {
  await page.goto('/es');
  const banner = page.getByRole('banner');
  const menu = banner.getByRole('button', { name: 'Abrir menú' });
  if (await menu.isVisible()) await menu.click();
  await banner.getByRole('link', { name: 'Admin', exact: true }).click();
  await expect(page).toHaveURL(/\/es\/admin$/);
}

test.describe('admin team', () => {
  test.beforeEach(async () => {
    await setEventSettings(TEST_SETTINGS);
  });

  test('the owner adds an admin, who can open the panel but cannot manage admins', async ({
    page,
    browser,
  }) => {
    const email = uniqueEmail('helper');
    await asAdmin(browser, async (owner) => {
      await owner.goto('/es/admin');
      await adminNav(owner).getByRole('link', { name: 'Administradores' }).click();
      await owner.getByLabel('Correo del nuevo administrador').fill(email);
      await owner.getByRole('button', { name: 'Agregar administrador' }).click();
      await expect(owner.getByRole('listitem').filter({ hasText: email })).toBeVisible();
    });

    await signUp(page, email);
    await signIn(page, email);
    await openAdminFromLanding(page);
    await expect(adminNav(page).getByRole('link', { name: 'Administradores' })).toHaveCount(0);
    expect((await page.goto('/es/admin/administradores'))?.status()).toBe(404);
  });

  test('a removed admin loses access on the next request', async ({ page, browser }) => {
    const email = uniqueEmail('former');
    await asAdmin(browser, async (owner) => {
      await owner.goto('/es/admin/administradores');
      await owner.getByLabel('Correo del nuevo administrador').fill(email);
      await owner.getByRole('button', { name: 'Agregar administrador' }).click();
      await expect(owner.getByRole('listitem').filter({ hasText: email })).toBeVisible();
    });
    await signUp(page, email);
    await signIn(page, email);
    expect((await page.goto('/es/admin'))?.status()).toBe(200);

    await asAdmin(browser, async (owner) => {
      await owner.goto('/es/admin/administradores');
      await owner.getByRole('button', { name: `Quitar a ${email}` }).click();
      await expect(owner.getByRole('listitem').filter({ hasText: email })).toHaveCount(0);
    });
    expect((await page.goto('/es/admin'))?.status()).toBe(404);
  });

  test('a runner sees no Admin link', async ({ page }) => {
    const email = uniqueEmail('runner');
    await signUp(page, email);
    await signIn(page, email);
    await page.goto('/es');
    const banner = page.getByRole('banner');
    const menu = banner.getByRole('button', { name: 'Abrir menú' });
    if (await menu.isVisible()) await menu.click();
    await expect(banner.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
  });
});
