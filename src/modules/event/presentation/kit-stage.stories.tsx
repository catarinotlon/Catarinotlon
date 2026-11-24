import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { KitStage } from './kit-stage';

const meta = {
  title: 'Event/KitStage',
  component: KitStage,
  tags: ['autodocs'],
} satisfies Meta<typeof KitStage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The shirt and the medal on the dotted panel. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('img', { name: /vista de frente/ })).toBeVisible();
    await expect(canvas.getByRole('img', { name: /finalista 5K/ })).toBeVisible();
    await expect(canvasElement.querySelector('.dotted-ribbon')).toBeNull();
    const frame = canvas.getByRole('img', { name: /finalista 5K/ }).parentElement;
    await expect(frame).not.toHaveClass('bg-ink');
    await expect(frame).toHaveClass('studio-backdrop');
    await expect(getComputedStyle(frame as Element).backgroundImage).toContain('radial-gradient');
  },
};
