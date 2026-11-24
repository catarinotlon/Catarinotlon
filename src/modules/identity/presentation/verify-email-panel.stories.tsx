import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { VerifyEmailPanel } from './verify-email-panel';

const meta = {
  title: 'Identity/VerifyEmailPanel',
  component: VerifyEmailPanel,
  tags: ['autodocs'],
  args: {
    email: 'sofia@example.test',
    verified: false,
    resendAction: async () => ({ done: true }),
  },
} satisfies Meta<typeof VerifyEmailPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Waiting for the runner to open the link. */
export const Waiting: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Confirma tu correo' })).toBeVisible();
    await expect(canvas.getByText(/sofia@example\.test/)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Reenviar el correo' }));
    await expect(await canvas.findByRole('status')).toHaveTextContent('Te enviamos otro enlace.');
  },
};

/** The address is unknown, for example after a new browser session. */
export const WithoutEmail: Story = {
  args: { email: null },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(/Te enviamos un enlace a tu correo/),
    ).toBeVisible();
  },
};

/** The link was opened. */
export const Verified: Story = {
  args: { verified: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: '¡Correo confirmado!' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Continuar al pago' })).toBeVisible();
  },
};

async function expectBusy(button: HTMLElement) {
  await expect(button).toHaveAttribute('aria-busy', 'true');
  await expect(button).toBeDisabled();
}

/** Resending the email shows that it is working. */
export const ResendPending: Story = {
  args: { resendAction: () => new Promise<never>(() => {}) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Reenviar el correo' }));
    await expectBusy(await canvas.findByRole('button', { name: 'Reenviando…' }));
  },
};
