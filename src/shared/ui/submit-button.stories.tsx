import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { SubmitButton } from './submit-button';

const meta = {
  title: 'Shared/SubmitButton',
  component: SubmitButton,
  tags: ['autodocs'],
  args: { children: 'Cerrar sesión', pendingLabel: 'Cerrando sesión…' },
} satisfies Meta<typeof SubmitButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Inside a form with a server action, it spins while the action runs. */
export const FollowsItsForm: Story = {
  render: (args) => (
    <form action={() => new Promise<void>(() => {})}>
      <SubmitButton {...args} />
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Cerrar sesión' }));
    const button = await canvas.findByRole('button', { name: 'Cerrando sesión…' });
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await expect(button).toHaveAttribute('type', 'submit');
  },
};

/** A form that tracks its own state can mark it pending directly. */
export const PendingFromProps: Story = {
  args: { pending: true },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('button', { name: 'Cerrando sesión…' }),
    ).toHaveAttribute('aria-busy', 'true');
  },
};
