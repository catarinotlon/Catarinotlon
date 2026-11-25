import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { AccountMenu } from './account-menu';

const meta = {
  title: 'Shared/AccountMenu',
  component: AccountMenu,
  tags: ['autodocs'],
  args: { name: 'Sofía Ramírez', signOut: fn<() => Promise<void>>(async () => {}) },
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

/** The avatar shows the initials and opens the account menu. */
export const Closed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const avatar = canvas.getByRole('button', { name: 'Menú de tu cuenta' });
    await expect(avatar).toHaveTextContent('SR');
    await expect(avatar).toHaveAttribute('data-private');
    await expect(avatar).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.queryByRole('link', { name: 'Mi cuenta' })).toBeNull();
  },
};

/** Open, it lists where to go and signs out at the end. */
export const Open: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const avatar = canvas.getByRole('button', { name: 'Menú de tu cuenta' });
    await userEvent.click(avatar);
    await expect(avatar).toHaveAttribute('aria-expanded', 'true');
    const menu = within(canvas.getByRole('navigation', { name: 'Menú de tu cuenta' }));
    await expect(menu.getByText('Sofía Ramírez')).toHaveAttribute('data-private');
    await expect(menu.getByRole('link', { name: 'Mi cuenta' })).toHaveAttribute(
      'href',
      '/es/cuenta',
    );
    await expect(menu.getByRole('link', { name: 'Agregar otro corredor' })).toHaveAttribute(
      'href',
      '/es/cuenta/corredores/nuevo',
    );
    await expect(menu.queryByRole('link', { name: 'Admin' })).toBeNull();
    await userEvent.click(menu.getByRole('button', { name: 'Cerrar sesión' }));
    await waitFor(() => expect(args.signOut).toHaveBeenCalled());
  },
};

/** An admin also reaches the panel from it. */
export const Admin: Story = {
  args: { isAdmin: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Menú de tu cuenta' }));
    await expect(canvas.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/es/admin');
  },
};

/** Escape and a click outside close it, and Escape returns focus to the avatar. */
export const Closes: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const avatar = canvas.getByRole('button', { name: 'Menú de tu cuenta' });

    await userEvent.click(avatar);
    await userEvent.keyboard('{Escape}');
    await expect(avatar).toHaveAttribute('aria-expanded', 'false');
    await expect(avatar).toHaveFocus();

    await userEvent.click(avatar);
    await userEvent.click(canvasElement);
    await expect(avatar).toHaveAttribute('aria-expanded', 'false');
  },
};
