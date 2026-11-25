import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { AccountMenu } from './account-menu';
import type { MenuAccount } from './site-menu';

const ACCOUNT: MenuAccount = {
  name: 'Sofía Ramírez',
  payableCount: 1,
  runners: [
    { id: 'r-1', name: 'Sofía Ramírez', distance: '5K', bibNumber: '48213', stage: 'confirmed' },
    {
      id: 'r-2',
      name: 'Mateo Ramírez',
      distance: '3K',
      bibNumber: '27591',
      stage: 'pending_payment',
    },
  ],
};

const meta = {
  title: 'Shared/AccountMenu',
  component: AccountMenu,
  tags: ['autodocs'],
  args: { account: ACCOUNT, signOut: fn<() => Promise<void>>(async () => {}) },
  decorators: [
    (Story) => (
      <div className="flex min-h-80 justify-end">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AccountMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The button shows the initials and the first name, and opens the account menu. */
export const Closed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /Menú de tu cuenta/ });
    await expect(button).toHaveTextContent('SR');
    await expect(button).toHaveTextContent('Sofía');
    await expect(button).not.toHaveTextContent('Ramírez');
    await expect(button).toHaveAttribute('data-private');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.queryByRole('link', { name: 'Mi cuenta' })).toBeNull();
  },
};

/** Open, it lists the runners, pays what is pending, and signs out at the end. */
export const Open: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /Menú de tu cuenta/ });
    await userEvent.click(button);
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    const menu = within(canvas.getByRole('navigation', { name: 'Menú de tu cuenta' }));
    await expect(menu.getByText('Mi cuenta · 2 corredores')).toBeVisible();
    await expect(
      menu.getByText('Sofía Ramírez', { selector: 'p' }).closest('[data-private]'),
    ).not.toBeNull();
    const mateo = menu.getByRole('link', {
      name: /Mateo Ramírez.*3K · n\.º 27591.*Pago pendiente/,
    });
    await expect(mateo).toHaveAttribute('href', '/es/cuenta?runner=r-2');
    await expect(mateo).toHaveAttribute('data-private');
    await expect(menu.getByRole('link', { name: 'Pagar pendientes (1)' })).toHaveAttribute(
      'href',
      '/es/pago',
    );
    await expect(menu.getByRole('link', { name: 'Agregar otro corredor' })).toHaveAttribute(
      'href',
      '/es/cuenta/corredores/nuevo',
    );
    await expect(menu.getByRole('link', { name: 'Mi cuenta' })).toHaveAttribute(
      'href',
      '/es/cuenta',
    );
    await expect(menu.queryByRole('link', { name: 'Admin' })).toBeNull();
    await userEvent.click(menu.getByRole('button', { name: 'Cerrar sesión' }));
    await waitFor(() => expect(args.signOut).toHaveBeenCalled());
  },
};

/** With nothing pending, it offers no payment. */
export const NothingToPay: Story = {
  args: { account: { ...ACCOUNT, payableCount: 0 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Menú de tu cuenta/ }));
    await expect(canvas.queryByRole('link', { name: /Pagar pendientes/ })).toBeNull();
  },
};

/** An account without runners yet is sent to complete its registration. */
export const NoRunnersYet: Story = {
  args: { account: { name: 'Sofía Ramírez', runners: [], payableCount: 0 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Menú de tu cuenta/ }));
    await expect(canvas.getByRole('link', { name: 'Completa tu inscripción' })).toHaveAttribute(
      'href',
      '/es/inscripcion',
    );
    await expect(canvas.queryByRole('link', { name: 'Agregar otro corredor' })).toBeNull();
  },
};

/** Escape and a click outside close it, and Escape returns focus to the button. */
export const Closes: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /Menú de tu cuenta/ });

    await userEvent.click(button);
    await userEvent.keyboard('{Escape}');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button).toHaveFocus();

    await userEvent.click(button);
    await userEvent.click(canvasElement);
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  },
};

/** On a phone the button shows only the initials, so it fits next to the admin badge. */
export const Phone: Story = {
  globals: { viewport: { value: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: /Menú de tu cuenta/ });
    await expect(within(button).getByText('Sofía')).not.toBeVisible();
    await expect(button.getBoundingClientRect().width).toBeLessThanOrEqual(48);
  },
};
