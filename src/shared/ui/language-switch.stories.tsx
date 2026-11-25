import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { LanguageSwitch } from './language-switch';

const meta = {
  title: 'Shared/LanguageSwitch',
  component: LanguageSwitch,
  tags: ['autodocs'],
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: '/es' } } },
} satisfies Meta<typeof LanguageSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Compact form for the header. */
export const Compact: Story = {
  args: { variant: 'compact' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('link', { name: /^EN\s+English$/ })).toBeVisible();
    await expect(canvas.getByText('ES')).toHaveAttribute('aria-current', 'true');
  },
};

/** Full form for the footer. */
export const Full: Story = {
  args: { variant: 'full' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('link', { name: 'English' })).toHaveTextContent('English');
    await expect(canvas.getByText('Español')).toHaveAttribute('aria-current', 'true');
  },
};

/** The quiet header version: the same choices without an outline. */
export const Subtle: Story = {
  args: { variant: 'subtle' },
  play: async ({ canvasElement }) => {
    const group = within(within(canvasElement).getByRole('group', { name: 'Cambiar idioma' }));
    await expect(group.getByText('ES')).toHaveAttribute('aria-current', 'true');
    await expect(group.getByRole('link', { name: /EN/ })).toHaveAttribute('lang', 'en');
  },
};
