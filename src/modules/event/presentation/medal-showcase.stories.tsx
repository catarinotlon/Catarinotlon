import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { MedalShowcase } from './medal-showcase';

const meta = {
  title: 'Event/MedalShowcase',
  component: MedalShowcase,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="dark bg-ink p-6 pt-32 text-foreground">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MedalShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Starts on the 5K, with the finisher medal and the three podium medals. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('radio', { name: '5K' })).toBeChecked();
    const medals = canvas.getAllByRole('img');
    await expect(medals).toHaveLength(4);
    for (const medal of medals) await expect(medal.parentElement).toHaveClass('studio-backdrop');
    await expect(canvas.getByRole('img', { name: /finalista 5K/ })).toBeVisible();
    await expect(canvas.getByText('Primer lugar')).toHaveClass('uppercase');
    await expect(canvas.getByRole('heading', { name: /finalista 5K/ })).toHaveClass('text-left');
  },
};

/** Switching the distance swaps all four medals. */
export const SwitchTo3K: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('radio', { name: '3K' }));
    await expect(canvas.getByRole('img', { name: /finalista 3K/ })).toBeVisible();
    await expect(canvas.getByRole('img', { name: /Primer lugar 3K/ })).toBeVisible();
    await expect(canvas.queryByRole('img', { name: /5K/ })).toBeNull();
    for (const medal of canvas.getAllByRole('img')) {
      await expect(medal.parentElement).toHaveClass('studio-backdrop');
    }
  },
};

/** The highlight slides to the chosen distance instead of jumping. */
export const SmoothSwitch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const thumb = canvas.getByTestId('segmented-thumb');
    await expect(thumb).toHaveClass('transition-transform', 'motion-reduce:transition-none');
    await expect(getComputedStyle(thumb).transitionDuration).not.toBe('0s');
    const atFive = thumb.getBoundingClientRect().left;

    await userEvent.click(canvas.getByRole('radio', { name: '3K' }));
    await waitFor(() => expect(thumb.getBoundingClientRect().left).toBeLessThan(atFive));
    await expect(canvas.getByText('3K')).toHaveClass('text-inverse-foreground');
  },
};
