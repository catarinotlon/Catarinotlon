import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { CopyButton } from './copy-button';

const meta = {
  title: 'Shared/CopyButton',
  component: CopyButton,
  tags: ['autodocs'],
  args: { value: '002010077777777771', label: 'Copiar CLABE', copiedLabel: 'CLABE copiada' },
} satisfies Meta<typeof CopyButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Copies the value and confirms what was copied. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const written: string[] = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => void written.push(text) },
    });

    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Copiar CLABE' }));

    await waitFor(() => expect(written).toEqual(['002010077777777771']));
    await expect(
      await within(canvasElement).findByRole('button', { name: 'CLABE copiada' }),
    ).toBeVisible();
  },
};

/** The button keeps a 44 px touch target and shows a copy icon. */
export const TouchTarget: Story = {
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button');
    await expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    await expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  },
};
