import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, waitFor, within } from 'storybook/test';

import { ThemeSwitch } from './theme-switch';

const meta = {
  title: 'Shared/ThemeSwitch',
  component: ThemeSwitch,
  tags: ['autodocs'],
} satisfies Meta<typeof ThemeSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The label names the action, so it depends on the active theme. */
export const Default: Story = {
  play: async ({ canvasElement, globals }) => {
    const expected = globals.theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
    await waitFor(async () => {
      const button = within(canvasElement).getByRole('button', { name: expected });
      await expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    });
  },
};
