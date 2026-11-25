import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import Image from 'next/image';

import { RaceBib } from './race-bib';
import { ShirtPreview } from './shirt-preview';

const meta: Meta<typeof RaceBib> = {
  title: 'Shared/RaceBib',
  component: RaceBib,
  tags: ['autodocs'],
  args: {
    number: '48213',
    distance: '5K',
    brand: 'Catarinotlón',
    year: '2026',
    label: 'Race bib 48213, 5K',
  },
};

const cardWidth: Decorator = (Story) => (
  <div className="w-[420px] max-w-full">
    <Story />
  </div>
);

export default meta;
type Story = StoryObj<typeof RaceBib>;

/** The black bib: brand, distance, the number, and the dotted ribbon strip. */
export const FiveK: Story = {
  decorators: [cardWidth],
  play: async ({ canvasElement }) => {
    const bib = within(canvasElement).getByRole('img', { name: 'Race bib 48213, 5K' });
    await expect(bib).toHaveClass('bg-ink');
    const content = within(bib);
    await expect(content.getByText('48213')).toBeVisible();
    await expect(content.getByText('5K')).toBeVisible();
    await expect(content.getByText('2026')).toHaveClass('text-on-ink-accent');
    await expect(content.getByTestId('bib-ribbon')).toHaveClass('bg-primary');
  },
};

/** The other distance shows its own label. */
export const ThreeK: Story = {
  decorators: [cardWidth],
  args: { number: '31507', distance: '3K', label: 'Race bib 31507, 3K' },
  play: async ({ canvasElement }) => {
    const bib = within(canvasElement).getByRole('img', { name: 'Race bib 31507, 3K' });
    await expect(within(bib).getByText('3K')).toBeVisible();
  },
};

/** A sample bib, like the landing page's, can name both distances. */
export const BothDistances: Story = {
  decorators: [cardWidth],
  args: { distance: '3K/5K', label: 'Sample race bib 48213, 3K/5K' },
  play: async ({ canvasElement }) => {
    const bib = within(canvasElement).getByRole('img', { name: 'Sample race bib 48213, 3K/5K' });
    await expect(within(bib).getByText('3K/5K')).toBeVisible();
  },
};

/** The number scales with the bib, so it stays inside it at any width. */
export const Small: Story = {
  decorators: [
    (Story) => (
      <div className="w-32">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const bib = within(canvasElement).getByRole('img');
    await document.fonts.ready;
    const glyphs = document.createRange();
    glyphs.selectNodeContents(within(bib).getByText('48213'));
    await expect(glyphs.getBoundingClientRect().width).toBeLessThan(
      bib.getBoundingClientRect().width * 0.9,
    );
  },
};

/** The kit as the runner wears it: the bib on the front of the shirt, the name on the back. */
export const OnTheShirt: Story = {
  render: (args) => (
    <div className="grid max-w-[720px] grid-cols-2 gap-4">
      <figure className="m-0 flex flex-col gap-2">
        <div className="relative overflow-hidden rounded-2xl shadow-xl">
          <Image
            src="/images/shirt/shirt-front.jpg"
            alt="Front of the official shirt"
            width={612}
            height={830}
            className="block aspect-[614/900] w-full object-cover"
          />
          <div className="absolute top-[37%] left-[29%] w-[42%] -rotate-2 drop-shadow-lg">
            <RaceBib {...args} />
          </div>
        </div>
        <figcaption className="font-display font-bold uppercase">Front</figcaption>
      </figure>
      <figure className="m-0 flex flex-col gap-2">
        <ShirtPreview name="Sofía" />
        <figcaption className="font-display font-bold uppercase">Back</figcaption>
      </figure>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const front = canvas.getByRole('img', { name: 'Front of the official shirt' });
    const bib = canvas.getByRole('img', { name: 'Race bib 48213, 5K' });
    await expect(front).toBeVisible();
    await expect(bib).toBeVisible();
    const shirt = front.getBoundingClientRect();
    const worn = bib.getBoundingClientRect();
    await expect(worn.left).toBeGreaterThan(shirt.left);
    await expect(worn.right).toBeLessThan(shirt.right);
    await expect(canvas.getByTestId('shirt-name')).toHaveTextContent('SOFÍA');
  },
};
