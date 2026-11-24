import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Button } from './button';

const meta = {
  title: 'Shared/Button',
  component: Button,
  tags: ['autodocs'],
  args: { children: 'Inscríbete', onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The main call to action. */
export const Primary: Story = {
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Inscríbete' });
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledOnce();
    await expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  },
};

/** A secondary action. */
export const Outline: Story = { args: { variant: 'outline' } };

/** A high-contrast action on neutral surfaces. */
export const Inverse: Story = { args: { variant: 'inverse' } };

/** A low-emphasis action. */
export const Ghost: Story = { args: { variant: 'ghost' } };

/** Full width, for forms on narrow screens. */
export const FullWidth: Story = { args: { fullWidth: true } };

/** A disabled button does not respond. */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole('button');
    await userEvent.click(button, { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

/** The large pill used for a form's main action. */
export const Cta: Story = {
  args: { variant: 'cta' },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Inscríbete' });
    await expect(button).toHaveClass('rounded-full');
    await expect(button).toHaveStyle({ textTransform: 'uppercase', fontStyle: 'italic' });
  },
};

/** While the server works: it spins, says what is happening, and cannot be pressed twice. */
export const Pending: Story = {
  args: { variant: 'cta', pending: true, pendingLabel: 'Apartando tu lugar…' },
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Apartando tu lugar…' });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await expect(button.querySelector('[data-slot="spinner"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    await userEvent.click(button, { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

/** Without its own label, a pending button keeps its text next to the spinner. */
export const PendingKeepsLabel: Story = {
  args: { pending: true },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Inscríbete' });
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await expect(button.querySelector('[data-slot="spinner"]')).not.toBeNull();
  },
};
