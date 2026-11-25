import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { AdminChip } from './admin-chip';

const meta = {
  title: 'Shared/AdminChip',
  component: AdminChip,
  tags: ['autodocs'],
} satisfies Meta<typeof AdminChip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An admin reaches the panel from the header with one tap. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole('link', { name: 'Admin' });
    await expect(link).toHaveAttribute('href', '/es/admin');
    await expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  },
};
