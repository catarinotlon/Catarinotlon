import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { SiteMenu, type MenuAccount } from './site-menu';

const dot = <span className="size-2 rounded-full bg-current" />;

const SECTIONS = [
  { href: '#distancias', label: 'Distancias', icon: dot },
  { href: '#kit', label: 'Kit del corredor', icon: dot },
  { href: '#dia-de-carrera', label: 'Día de la carrera', icon: dot },
  { href: '#preguntas', label: 'Preguntas', icon: dot },
];

const ACCOUNT: MenuAccount = {
  name: 'Sofía Ramírez',
  payableCount: 1,
  runners: [
    { id: 'r-1', name: 'Sofía Ramírez', distance: '5K', bibNumber: '48213', stage: 'confirmed' },
    {
      id: 'r-2',
      name: 'Mateo Ramírez',
      distance: '3K',
      bibNumber: '71594',
      stage: 'pending_payment',
    },
  ],
};

const meta = {
  title: 'Shared/SiteMenu',
  component: SiteMenu,
  tags: ['autodocs'],
  args: { sections: SECTIONS, signOut: fn<() => Promise<void>>(async () => {}) },
  globals: { viewport: { value: 'mobile1' } },
} satisfies Meta<typeof SiteMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

async function openDrawer(canvasElement: HTMLElement) {
  const trigger = within(canvasElement).getByRole('button', { name: 'Abrir menú' });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(trigger);
  const drawer = await within(canvasElement).findByRole('dialog', { name: 'Menú' });
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  return drawer;
}

/** Signed out, the drawer holds the sections, the preferences, and how to register or sign in. */
export const SignedOut: Story = {
  play: async ({ canvasElement }) => {
    const drawer = within(await openDrawer(canvasElement));
    for (const name of ['Distancias', 'Kit del corredor', 'Día de la carrera', 'Preguntas']) {
      await expect(drawer.getByRole('link', { name })).toBeVisible();
    }
    await expect(drawer.getByRole('link', { name: 'Inscríbete' })).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();
    await expect(await drawer.findByRole('group', { name: 'Tema' })).toBeVisible();
    await expect(drawer.getByRole('group', { name: 'Cambiar idioma' })).toBeVisible();
    await expect(drawer.queryByRole('button', { name: 'Cerrar sesión' })).toBeNull();
  },
};

/** Escape and the close button both close the drawer and return focus to the menu button. */
export const Closing: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await openDrawer(canvasElement);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    await expect(canvas.getByRole('button', { name: 'Abrir menú' })).toHaveFocus();

    const drawer = within(await openDrawer(canvasElement));
    await userEvent.click(drawer.getByRole('button', { name: 'Cerrar menú' }));
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
};

/** Choosing a section closes the drawer, so the page scrolls to it in view. */
export const ChoosingASection: Story = {
  play: async ({ canvasElement }) => {
    canvasElement.addEventListener('click', (event) => event.preventDefault());
    const drawer = within(await openDrawer(canvasElement));
    await userEvent.click(drawer.getByRole('link', { name: 'Preguntas' }));
    await waitFor(() => expect(within(canvasElement).queryByRole('dialog')).toBeNull());
  },
};

/** Signed in, the account card leads to the account level instead of the sign-in links. */
export const SignedIn: Story = {
  args: { account: ACCOUNT },
  play: async ({ canvasElement }) => {
    const drawer = within(await openDrawer(canvasElement));
    await expect(drawer.queryByRole('link', { name: 'Iniciar sesión' })).toBeNull();
    const card = drawer.getByRole('button', { name: /Sofía Ramírez.*2 corredores/ });
    await expect(card).toHaveAttribute('data-private');
    await expect(drawer.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
  },
};

/** The account level lists each runner, links to the account with that runner chosen, and pays what is pending. */
export const AccountLevel: Story = {
  args: { account: ACCOUNT },
  play: async ({ canvasElement }) => {
    const drawer = within(await openDrawer(canvasElement));
    await userEvent.click(drawer.getByRole('button', { name: /Sofía Ramírez/ }));

    const account = within(drawer.getByRole('navigation', { name: 'Tu cuenta' }));
    const mateo = account.getByRole('link', {
      name: /Mateo Ramírez.*3K · n\.º 71594.*Pago pendiente/,
    });
    await expect(mateo).toHaveAttribute('href', '/es/cuenta?runner=r-2');
    await expect(mateo).toHaveAttribute('data-private');
    await expect(
      account.getByRole('link', { name: /Sofía Ramírez.*Inscripción confirmada/ }),
    ).toHaveAttribute('href', '/es/cuenta?runner=r-1');
    await expect(account.getByRole('link', { name: 'Agregar otro corredor' })).toHaveAttribute(
      'href',
      '/es/cuenta/corredores/nuevo',
    );
    await expect(account.getByRole('link', { name: 'Pagar pendientes (1)' })).toHaveAttribute(
      'href',
      '/es/pago',
    );
    await expect(drawer.queryByRole('link', { name: 'Distancias' })).toBeNull();

    await userEvent.click(drawer.getByRole('button', { name: 'Volver al menú' }));
    await expect(drawer.getByRole('link', { name: 'Distancias' })).toBeVisible();
    await expect(drawer.getByRole('button', { name: /Sofía Ramírez/ })).toHaveFocus();
  },
};

/** With nothing pending, the account level offers no payment. */
export const NothingToPay: Story = {
  args: { account: { ...ACCOUNT, payableCount: 0 } },
  play: async ({ canvasElement }) => {
    const drawer = within(await openDrawer(canvasElement));
    await userEvent.click(drawer.getByRole('button', { name: /Sofía Ramírez/ }));
    await expect(drawer.queryByRole('link', { name: /Pagar pendientes/ })).toBeNull();
  },
};

/** An account without runners yet is sent to complete its registration. */
export const NoRunnersYet: Story = {
  args: { account: { name: 'Sofía Ramírez', runners: [], payableCount: 0 } },
  play: async ({ canvasElement }) => {
    const drawer = within(await openDrawer(canvasElement));
    await userEvent.click(drawer.getByRole('button', { name: /Sofía Ramírez.*sin corredores/ }));
    await expect(drawer.getByRole('link', { name: 'Completa tu inscripción' })).toHaveAttribute(
      'href',
      '/es/inscripcion',
    );
    await expect(drawer.queryByRole('link', { name: 'Agregar otro corredor' })).toBeNull();
  },
};

/** An admin reaches the panel from the drawer. */
export const Admin: Story = {
  args: { account: ACCOUNT, isAdmin: true },
  play: async ({ canvasElement }) => {
    const drawer = within(await openDrawer(canvasElement));
    await expect(drawer.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/es/admin');
  },
};

/** Closing slides the drawer out instead of making it vanish, and only then removes it. */
export const AnimatedClose: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dialog = await openDrawer(canvasElement);
    await waitFor(() => expect(getComputedStyle(dialog).translate).toBe('none'));

    await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar menú' }));
    await expect(dialog).toHaveAttribute('data-closing');
    await waitFor(() => expect(getComputedStyle(dialog).translate).not.toBe('none'));
    await expect(canvas.getByRole('dialog', { name: 'Menú' })).toBeInTheDocument();

    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull(), { timeout: 2000 });
    await expect(canvas.getByRole('button', { name: 'Abrir menú' })).toHaveFocus();
  },
};

/** The account level also leads to the account page itself, as the wide account menu does. */
export const AccountPageLink: Story = {
  args: { account: ACCOUNT },
  play: async ({ canvasElement }) => {
    canvasElement.addEventListener('click', (event) => event.preventDefault());
    const drawer = within(await openDrawer(canvasElement));
    await userEvent.click(drawer.getByRole('button', { name: /Sofía Ramírez/ }));
    const account = within(drawer.getByRole('navigation', { name: 'Tu cuenta' }));
    const link = account.getByRole('link', { name: /^Mi cuenta.*Boletos, pagos y tus datos/ });
    await expect(link).toHaveAttribute('href', '/es/cuenta');

    await userEvent.click(link);
    await waitFor(() => expect(within(canvasElement).queryByRole('dialog')).toBeNull());
  },
};
