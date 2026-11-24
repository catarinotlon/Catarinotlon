import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { RegistrationSteps } from './registration-steps';

const meta = {
  title: 'Shared/RegistrationSteps',
  component: RegistrationSteps,
  tags: ['autodocs'],
  args: { current: 'race' },
} satisfies Meta<typeof RegistrationSteps>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Step 2 of 3. */
export const Race: Story = {
  play: async ({ canvasElement }) => {
    const steps = within(
      within(canvasElement).getByRole('list', { name: 'Pasos de tu inscripción' }),
    );
    await expect(steps.getByText('Tu carrera').closest('li')).toHaveAttribute(
      'aria-current',
      'step',
    );
    await expect(steps.getByText('Pago').closest('li')).not.toHaveAttribute('aria-current');
  },
};

/** Step 3 of 3. */
export const Payment: Story = {
  args: { current: 'payment' },
  play: async ({ canvasElement }) => {
    const steps = within(
      within(canvasElement).getByRole('list', { name: 'Pasos de tu inscripción' }),
    );
    await expect(steps.getByText('Pago').closest('li')).toHaveAttribute('aria-current', 'step');
  },
};
