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

/** The moon and the sun cross-fade and turn instead of swapping at once. */
export const SmoothIconSwap: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = await canvas.findByRole('button');
    const moon = button.querySelector('[data-icon="moon"]');
    const sun = button.querySelector('[data-icon="sun"]');
    await expect(moon).not.toBeNull();
    await expect(sun).not.toBeNull();
    for (const icon of [moon, sun]) {
      await expect(icon).toHaveClass(
        'transition-[opacity,transform]',
        'motion-reduce:transition-none',
      );
    }
    const hidden = [moon, sun].filter((icon) => icon?.classList.contains('opacity-0'));
    await expect(hidden).toHaveLength(1);
  },
};

/** In the phone menu, both themes are named choices and the active one is checked. */
export const Segmented: Story = {
  args: { variant: 'segmented' },
  play: async ({ canvasElement, globals }) => {
    const canvas = within(canvasElement);
    const group = await canvas.findByRole('group', { name: 'Tema' });
    const dark = within(group).getByRole('radio', { name: 'Oscuro' });
    const light = within(group).getByRole('radio', { name: 'Claro' });
    await expect(globals.theme === 'dark' ? dark : light).toBeChecked();
    await expect(globals.theme === 'dark' ? light : dark).not.toBeChecked();
    await expect(group.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  },
};
