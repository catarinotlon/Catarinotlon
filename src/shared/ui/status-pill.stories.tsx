import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { DistancePill, IconBadge, StatusPill } from './status-pill';

const meta = {
  title: 'Shared/StatusPill',
  component: StatusPill,
  tags: ['autodocs'],
  args: { children: 'Pagado', tone: 'solid' },
} satisfies Meta<typeof StatusPill>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A completed state. */
export const Solid: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Pagado')).toHaveClass('bg-inverse');
  },
};

/** A state still waiting. */
export const Outline: Story = {
  args: { tone: 'outline', children: 'Por entregar' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Por entregar')).toHaveClass('border-2');
  },
};

/** A state an admin must act on. */
export const Gold: Story = {
  args: { tone: 'gold', children: 'En revisión' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('En revisión')).toHaveClass('bg-gold');
  },
};

/** A state that needs the runner's attention. */
export const Alert: Story = {
  args: { tone: 'alert', children: 'Comprobante rechazado' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Comprobante rechazado')).toHaveClass(
      'text-primary-text',
    );
  },
};

/** The red pill that names a distance. */
export const Distance: Story = {
  render: () => <DistancePill distance="5K" />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('5K')).toHaveClass('bg-primary');
  },
};

/** The round icon above a status card. */
export const Icon: Story = {
  render: () => <IconBadge icon="mail" />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  },
};

/** The key icon of the password screens. */
export const KeyIcon: Story = {
  render: () => <IconBadge icon="key" />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('svg path, svg circle')).not.toBeNull();
  },
};
