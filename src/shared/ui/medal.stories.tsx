import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { Medal, MedalInStudio } from './medal';

const meta: Meta<typeof Medal> = {
  title: 'Shared/Medal',
  component: Medal,
  tags: ['autodocs'],
  args: { kind: 'finisher', distance: '3K', label: 'Finisher medal' },
  decorators: [
    (Story) => (
      <div className="w-48">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Medal>;

const source = (image: HTMLElement) => decodeURIComponent(image.getAttribute('src') ?? '');

/** The finisher medal of a distance, with its ribbon. */
export const Finisher3K: Story = {
  play: async ({ canvasElement }) => {
    const medal = within(canvasElement).getByRole('img', { name: 'Finisher medal' });
    await expect(medal.tagName).toBe('IMG');
    await expect(source(medal)).toContain('/images/medals/finisher-3k.webp');
  },
};

/** The other distance shows its own artwork. */
export const Finisher5K: Story = {
  args: { distance: '5K' },
  play: async ({ canvasElement }) => {
    const medal = within(canvasElement).getByRole('img');
    await expect(source(medal)).toContain('/images/medals/finisher-5k.webp');
  },
};

/** A podium medal carries its place. */
export const PodiumSecond: Story = {
  args: { kind: 'podium', distance: '5K', place: 2, label: 'Second place' },
  play: async ({ canvasElement }) => {
    const medal = within(canvasElement).getByRole('img', { name: 'Second place' });
    await expect(source(medal)).toContain('/images/medals/podium-5k-2.webp');
  },
};

/** On the studio backdrop that matches the shirt photo. */
export const InStudio: Story = {
  render: (args) => <MedalInStudio {...args} />,
  play: async ({ canvasElement }) => {
    const medal = within(canvasElement).getByRole('img', { name: 'Finisher medal' });
    await expect(medal.parentElement).toHaveClass('studio-backdrop');
    await expect(getComputedStyle(medal.parentElement as Element).backgroundImage).toContain(
      'radial-gradient',
    );
  },
};
