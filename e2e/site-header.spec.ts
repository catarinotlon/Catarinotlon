import { expect, test, type Page } from '@playwright/test';

import { setEventSettings, TEST_SETTINGS, uniqueEmail } from './support/database';
import { asAdmin, signIn, signUp } from './support/flows';

test.describe('site header', () => {
  test('every page offers the landing navigation and the account actions', async ({
    page,
    isMobile,
  }) => {
    for (const path of ['/es/crear-cuenta', '/es/iniciar-sesion', '/es/aviso-de-privacidad']) {
      await page.goto(path);
      const banner = page.getByRole('banner');
      if (isMobile) await banner.getByRole('button', { name: 'Abrir menú' }).click();
      const drawer = page.getByRole('dialog', { name: 'Menú' });
      const nav = isMobile
        ? drawer.getByRole('navigation', { name: 'Menú' })
        : banner.getByRole('navigation', { name: 'Navegación principal' });

      await expect(nav.getByRole('link', { name: 'Kit del corredor' })).toHaveAttribute(
        'href',
        '/es#kit',
      );
      const account = isMobile ? drawer : banner;
      await expect(account.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();
      await expect(account.getByRole('link', { name: 'Inscríbete' })).toBeVisible();
    }
  });

  test('a signed-in runner opens the account menu from the avatar and signs out', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'On phones the account lives in the menu drawer.');
    await setEventSettings(TEST_SETTINGS);
    const email = uniqueEmail('avatar-menu');
    await signUp(page, email);
    await signIn(page, email);
    await page.goto('/es/pago');
    const banner = page.getByRole('banner');
    await expect(banner.getByRole('button', { name: 'Cerrar sesión' })).toHaveCount(0);

    const account = banner.getByRole('button', { name: 'Menú de tu cuenta' });
    await expect(account).toContainText('Sofia');
    await account.click();
    const menu = banner.getByRole('navigation', { name: 'Menú de tu cuenta' });
    await expect(menu.getByRole('link', { name: 'Mi cuenta' })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Agregar otro corredor' })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Pagar pendientes (1)' })).toHaveAttribute(
      'href',
      '/es/pago',
    );
    await expect(menu.getByRole('link', { name: /Sofia Prueba.*Pago pendiente/ })).toHaveAttribute(
      'href',
      /\/es\/cuenta\?runner=[0-9a-f-]{36}$/,
    );
    await menu.getByRole('button', { name: 'Cerrar sesión' }).click();

    await expect(page).toHaveURL(/\/es$/);
    await expect(banner.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();
  });
});

test.describe('wide header', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, 'The section links show inline on wide screens only.');
  });

  test('on the landing page, the link of the section in view is marked current', async ({
    page,
  }) => {
    await page.goto('/es');
    const nav = page.getByRole('banner').getByRole('navigation', { name: 'Navegación principal' });
    await expect(nav.locator('[aria-current]')).toHaveCount(0);

    await page.locator('#kit').scrollIntoViewIfNeeded();
    await expect(nav.getByRole('link', { name: 'Kit del corredor' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(nav.locator('[aria-current]')).toHaveCount(1);
  });

  test('an admin reaches the panel from the admin chip, not from the section links', async ({
    browser,
  }) => {
    await asAdmin(browser, async (page) => {
      await page.goto('/es');
      const banner = page.getByRole('banner');
      await expect(
        banner
          .getByRole('navigation', { name: 'Navegación principal' })
          .getByRole('link', { name: 'Admin' }),
      ).toHaveCount(0);
      await banner.getByRole('link', { name: 'Admin', exact: true }).click();
      await expect(page).toHaveURL(/\/es\/admin$/);
    });
  });
});

async function expectTidyHeader(page: Page, extra = 'a, button') {
  const banner = page.getByRole('banner');
  const home = banner.getByRole('link', { name: /ir al inicio/ });
  expect(await home.evaluate((link) => link.scrollWidth <= link.clientWidth)).toBe(true);
  const width = page.viewportSize()?.width ?? Infinity;
  const boxes = await banner.locator(extra).evaluateAll((elements) =>
    elements
      .map((element) => element.getBoundingClientRect())
      .filter((box) => box.width > 0 && box.height > 0)
      .map((box) => ({ left: box.left, right: box.right, top: box.top, bottom: box.bottom })),
  );
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
}

for (const width of [1280, 1440]) {
  test.describe(`wide header at ${width} px`, () => {
    test.use({ viewport: { width, height: 800 } });
    test.beforeEach(async ({ isMobile }) => {
      test.skip(isMobile, 'Wide screens only.');
      await setEventSettings(TEST_SETTINGS);
    });

    test('signed out, the logo, the links, and the controls never overlap', async ({ page }) => {
      await page.goto('/es');
      await expectTidyHeader(page);
    });

    test('for an admin, the logo, the links, and the controls never overlap', async ({
      browser,
    }) => {
      await asAdmin(browser, async (page) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto('/es');
        await expectTidyHeader(page);
      });
    });
  });
}

for (const width of [320, 375, 390]) {
  test.describe(`admin panel header on a ${width} px phone`, () => {
    test.use({ viewport: { width, height: 700 } });
    test.beforeEach(async () => {
      await setEventSettings(TEST_SETTINGS);
    });

    test('is the same header as every page: the logo and the menu', async ({ browser }) => {
      await asAdmin(browser, async (page) => {
        await page.setViewportSize({ width, height: 700 });
        await page.goto('/es/admin');
        const banner = page.getByRole('banner');
        await expect(banner.getByRole('button', { name: /Cambiar a tema/ })).toBeHidden();
        await expect(banner.getByRole('button', { name: /Menú de tu cuenta/ })).toBeHidden();
        await expectTidyHeader(page);

        await banner.getByRole('button', { name: 'Abrir menú' }).click();
        const drawer = page.getByRole('dialog', { name: 'Menú' });
        await expect(drawer.getByRole('link', { name: 'Admin' })).toHaveAttribute(
          'href',
          '/es/admin',
        );
        await expect(drawer.getByRole('button', { name: /Admin Prueba/ })).toBeVisible();
      });
    });
  });
}

test.describe('admin panel header on wide screens', () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test.beforeEach(async ({ isMobile }) => {
    test.skip(isMobile, 'Wide screens only.');
    await setEventSettings(TEST_SETTINGS);
  });

  test('is the same header as every page, with the section links and the admin chip', async ({
    browser,
  }) => {
    await asAdmin(browser, async (page) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto('/es/admin');
      const banner = page.getByRole('banner');
      await expect(
        banner
          .getByRole('navigation', { name: 'Navegación principal' })
          .getByRole('link', { name: 'Kit del corredor' }),
      ).toHaveAttribute('href', '/es#kit');
      await expect(banner.getByRole('link', { name: 'Admin', exact: true })).toBeVisible();
      await expect(banner.getByRole('button', { name: /Menú de tu cuenta/ })).toContainText(
        'Admin',
      );
      await expectTidyHeader(page);
    });
  });
});

test.describe('phone menu drawer', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(!isMobile, 'The drawer replaces the header controls on phones only.');
  });

  test('the header keeps only the logo and the menu, which holds everything else', async ({
    page,
  }) => {
    await page.goto('/es');
    const banner = page.getByRole('banner');
    await expect(banner.getByRole('button', { name: /Cambiar a tema/ })).toBeHidden();
    await expect(banner.getByRole('link', { name: 'Inscríbete' })).toBeHidden();

    await banner.getByRole('button', { name: 'Abrir menú' }).click();
    const drawer = page.getByRole('dialog', { name: 'Menú' });
    await expect(drawer.getByRole('link', { name: 'Kit del corredor' })).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Inscríbete' })).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();
    await expect(drawer.getByRole('group', { name: 'Cambiar idioma' })).toBeVisible();

    await drawer.locator('label', { has: page.getByRole('radio', { name: 'Oscuro' }) }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);

    await banner.getByRole('button', { name: 'Abrir menú' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Menú' })).toBeHidden();
  });

  test('a signed-in runner opens a runner from the account level of the menu', async ({ page }) => {
    await setEventSettings(TEST_SETTINGS);
    const email = uniqueEmail('drawer-account');
    await signUp(page, email, 'Rocio Cajon');
    await signIn(page, email);
    await page.goto('/es');

    await page.getByRole('banner').getByRole('button', { name: 'Abrir menú' }).click();
    const drawer = page.getByRole('dialog', { name: 'Menú' });
    await drawer.getByRole('button', { name: /Rocio Cajon.*1 corredor/ }).click();

    const account = drawer.getByRole('navigation', { name: 'Tu cuenta' });
    await expect(account.getByRole('link', { name: 'Pagar pendientes (1)' })).toHaveAttribute(
      'href',
      '/es/pago',
    );
    await expect(account.getByRole('link', { name: 'Agregar otro corredor' })).toBeVisible();
    await account.getByRole('link', { name: /Rocio Cajon.*Pago pendiente/ }).click();

    await expect(page).toHaveURL(/\/es\/cuenta\?runner=[0-9a-f-]{36}$/);
    await expect(page.getByTestId('selected-runner')).toHaveText('Rocio Cajon');
    await expect(page.getByRole('dialog', { name: 'Menú' })).toBeHidden();
  });

  test('the account level leads to the account page', async ({ page }) => {
    await setEventSettings(TEST_SETTINGS);
    const email = uniqueEmail('drawer-page');
    await signUp(page, email);
    await signIn(page, email);
    await page.goto('/es/aviso-de-privacidad');

    await page.getByRole('banner').getByRole('button', { name: 'Abrir menú' }).click();
    const drawer = page.getByRole('dialog', { name: 'Menú' });
    await drawer.getByRole('button', { name: /Mi cuenta/ }).click();
    await drawer
      .getByRole('navigation', { name: 'Tu cuenta' })
      .getByRole('link', { name: /^Mi cuenta/ })
      .click();

    await expect(page).toHaveURL(/\/es\/cuenta$/);
    await expect(page.getByRole('dialog', { name: 'Menú' })).toBeHidden();
  });

  test('the account level goes back to the menu and signs out', async ({ page }) => {
    await setEventSettings(TEST_SETTINGS);
    const email = uniqueEmail('drawer-back');
    await signUp(page, email);
    await signIn(page, email);
    await page.goto('/es/aviso-de-privacidad');

    await page.getByRole('banner').getByRole('button', { name: 'Abrir menú' }).click();
    const drawer = page.getByRole('dialog', { name: 'Menú' });
    await drawer.getByRole('button', { name: /Mi cuenta/ }).click();
    await drawer.getByRole('button', { name: 'Volver al menú' }).click();
    await expect(drawer.getByRole('link', { name: 'Distancias' })).toBeVisible();

    await drawer.getByRole('button', { name: /Mi cuenta/ }).click();
    await drawer.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/es$/);
  });
});
