import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { SignOutForm } from './sign-out-form';

const meta = {
  title: 'Shared/SignOutForm',
  component: SignOutForm,
  tags: ['autodocs'],
  args: { action: fn<() => Promise<void>>(async () => {}) },
} satisfies Meta<typeof SignOutForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Signing out is a real button that submits the form. */
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Cerrar sesión' }));
    await expect(args.action).toHaveBeenCalled();
  },
};

/** While signing out, it says so and cannot be pressed again. */
export const Pending: Story = {
  args: { action: fn<() => Promise<void>>(() => new Promise(() => {})) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Cerrar sesión' }));
    const button = await canvas.findByRole('button', { name: 'Cerrando sesión…' });
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await expect(button).toBeDisabled();
  },
};
