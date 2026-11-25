import { randomUUID } from 'node:crypto';

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { setEventSettings, TEST_SETTINGS, ticketOf, uniqueEmail } from './support/database';
import { asAdmin, openReview, signIn, signUp, uploadReceipt } from './support/flows';

const KIT_PICKUP = '/es/admin/entrega-de-kits';

/** Signs a runner up, pays, and has an admin confirm them, as on race day. */
async function confirmedRunner(page: Page, browser: Browser, prefix: string) {
  const email = uniqueEmail(prefix);
  const name = `Kit ${email.slice(prefix.length + 1, prefix.length + 7)}`;
  await signUp(page, email, name);
  await signIn(page, email);
  await uploadReceipt(page);
  await asAdmin(browser, async (admin) => {
    await openReview(admin, name);
    await admin.getByRole('button', { name: 'Confirmar pago' }).click();
    await expect(admin.getByText('Pago confirmado')).toBeVisible();
  });
  return { name, ticket: await ticketOf(email) };
}

test.describe('kit pickup', () => {
  test.beforeEach(async () => {
    await setEventSettings(TEST_SETTINGS);
  });

  test('a scanned ticket shows the kit, delivers it, and offers to undo', async ({
    page,
    browser,
  }) => {
    const runner = await confirmedRunner(page, browser, 'scan');

    await asAdmin(browser, async (admin) => {
      await admin.goto(`${KIT_PICKUP}?ticket=${runner.ticket}`);
      const result = admin.getByRole('region', { name: 'Resultado del boleto' });
      await expect(result.getByRole('heading', { name: 'Entregar kit' })).toBeVisible();
      await expect(result.getByText(runner.name)).toBeVisible();

      await result.getByRole('button', { name: 'Marcar kit entregado' }).click();
      await expect(result.getByText('Kit entregado')).toBeVisible();

      const toast = admin
        .getByRole('status')
        .filter({ hasText: `Kit de ${runner.name} entregado` });
      await expect(toast).toBeVisible({ timeout: 10_000 });
      await toast.getByRole('button', { name: 'Deshacer' }).click();
      await expect(toast).toBeHidden();

      await admin.goto(`${KIT_PICKUP}?ticket=${runner.ticket}`);
      await expect(
        admin
          .getByRole('region', { name: 'Resultado del boleto' })
          .getByRole('heading', { name: 'Entregar kit' }),
      ).toBeVisible();
    });
  });

  test('scanning a delivered kit says it was already delivered', async ({ page, browser }) => {
    const runner = await confirmedRunner(page, browser, 'again');

    await asAdmin(browser, async (admin) => {
      await admin.goto(`${KIT_PICKUP}?ticket=${runner.ticket}`);
      const result = admin.getByRole('region', { name: 'Resultado del boleto' });
      await result.getByRole('button', { name: 'Marcar kit entregado' }).click();
      await expect(result.getByText('Kit entregado')).toBeVisible();

      await admin.goto(`${KIT_PICKUP}?ticket=${runner.ticket}`);
      await expect(
        admin
          .getByRole('region', { name: 'Resultado del boleto' })
          .getByRole('heading', { name: 'Ya se entregó' }),
      ).toBeVisible();
    });
  });

  test('a ticket that matches no registration says so', async ({ browser }) => {
    await asAdmin(browser, async (admin) => {
      await admin.goto(`${KIT_PICKUP}?ticket=${randomUUID()}`);
      await expect(
        admin
          .getByRole('region', { name: 'Resultado del boleto' })
          .getByRole('heading', { name: 'Boleto no encontrado' }),
      ).toBeVisible();
      await expect(admin.getByText('No encontramos a ese corredor.')).toBeHidden();
    });
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`an open result has no accessibility violations in ${theme}`, async ({
      page,
      browser,
    }) => {
      const runner = await confirmedRunner(page, browser, `axe-${theme}`);

      await asAdmin(browser, async (admin) => {
        await admin.addInitScript((value) => localStorage.setItem('theme', value), theme);
        await admin.goto(`${KIT_PICKUP}?ticket=${runner.ticket}`);
        await expect(
          admin
            .getByRole('region', { name: 'Resultado del boleto' })
            .getByRole('heading', { name: 'Entregar kit' }),
        ).toBeVisible();
        const results = await new AxeBuilder({ page: admin }).analyze();
        expect(results.violations.map((violation) => violation.id)).toEqual([]);
      });
    });
  }
});
