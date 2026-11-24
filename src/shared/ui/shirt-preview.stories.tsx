import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { ShirtPreview } from './shirt-preview';

const meta = {
  title: 'Shared/ShirtPreview',
  component: ShirtPreview,
  tags: ['autodocs'],
  args: { name: 'Sofía' },
  decorators: [
    (Story) => (
      <div className="max-w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ShirtPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The chosen name, uppercase, over the back of the shirt. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('shirt-name')).toHaveTextContent('SOFÍA');
  },
};

/** With no name yet, a neutral placeholder is shown. */
export const Empty: Story = {
  args: { name: '   ' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('shirt-name')).toHaveTextContent('NOMBRE');
  },
};

/** A long name scales down so it stays on the shirt. */
export const LongName: Story = {
  args: { name: 'Maximiliano Alejandro de la Santísima Trinidad' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const label = canvas.getByTestId('shirt-name');
    const frame = label.parentElement as HTMLElement;
    const text = document.createRange();
    text.selectNodeContents(label);
    await expect(text.getBoundingClientRect().width).toBeLessThanOrEqual(
      frame.getBoundingClientRect().width,
    );
  },
};

/** The name is untrusted text and must render literally. */
export const UntrustedText: Story = {
  args: { name: '<img src=x onerror=alert(1)>' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('shirt-name')).toHaveTextContent(
      '<IMG SRC=X ONERROR=ALERT(1)>',
    );
    await expect(canvas.getByTestId('shirt-name').querySelector('img')).toBeNull();
  },
};
