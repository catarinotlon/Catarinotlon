import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { MorphButton } from './morph-button';

const meta = {
  title: 'UI/MorphButton',
  component: MorphButton,
  tags: ['autodocs'],
  args: {
    state: 'idle',
    children: 'Reemplazar comprobante',
    pendingLabel: 'Enviando…',
    doneLabel: 'Comprobante reemplazado',
    onClick: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MorphButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const isCircle = (button: HTMLElement) => button.offsetWidth === button.offsetHeight;

/** At rest it is a full-width outlined pill. */
export const Idle: Story = {
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Reemplazar comprobante' });
    await expect(button).toBeEnabled();
    await expect(isCircle(button)).toBe(false);
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

/** While waiting it shrinks to a circle with a spinner, says so, and cannot be pressed. */
export const Pending: Story = {
  args: { state: 'pending' },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Enviando…' });
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await expect(button).toBeDisabled();
    await waitFor(() => expect(isCircle(button)).toBe(true));
  },
};

/** When done the circle fills in and a check mark draws itself. */
export const Done: Story = {
  args: { state: 'done' },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Comprobante reemplazado' });
    await expect(button).toBeDisabled();
    await expect(button).not.toHaveAttribute('aria-busy');
    await expect(button.querySelector('svg')).not.toBeNull();
    await waitFor(() => expect(isCircle(button)).toBe(true));
  },
};
