import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { ShirtTryOn } from './shirt-try-on';

const meta = {
  title: 'Event/ShirtTryOn',
  component: ShirtTryOn,
  tags: ['autodocs'],
} satisfies Meta<typeof ShirtTryOn>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Starts with the placeholder name. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('shirt-name')).toHaveTextContent('NOMBRE');
  },
};

/** The preview follows what is typed. */
export const Typing: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Escribe tu nombre o apodo'), 'Sofi');
    await expect(canvas.getByTestId('shirt-name')).toHaveTextContent('SOFI');
  },
};
