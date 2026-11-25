import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ReceiptReceivedScreen } from './receipt-received-screen';

const meta = {
  title: 'Payments/ReceiptReceivedScreen',
  component: ReceiptReceivedScreen,
  tags: ['autodocs'],
  args: { onContinue: fn(), leaving: false },
} satisfies Meta<typeof ReceiptReceivedScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const screen = (canvasElement: HTMLElement) =>
  within(canvasElement.ownerDocument.body).getByRole('dialog', { name: 'Comprobante recibido' });

/** A full-screen modal says the receipt arrived and is being validated. */
export const Received: Story = {
  play: async ({ canvasElement }) => {
    const dialog = screen(canvasElement);
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleDescription(
      'Lo estamos validando. Te avisamos por correo en cuanto tu pago quede confirmado.',
    );
    await expect(within(dialog).getByRole('button', { name: 'Continuar' })).toHaveFocus();
  },
};

/** The screen is the brand red in both themes. */
export const BrandRed: Story = {
  play: async ({ canvasElement }) => {
    await expect(getComputedStyle(screen(canvasElement)).backgroundColor).toBe('rgb(212, 32, 22)');
  },
};

/** "Continue" moves on. */
export const Continue: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(screen(canvasElement)).getByRole('button', { name: 'Continuar' }));
    await expect(args.onContinue).toHaveBeenCalledTimes(1);
  },
};

/** Escape moves on too, instead of leaving the runner on the form. */
export const Escape: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.keyboard('{Escape}');
    await expect(args.onContinue).toHaveBeenCalledTimes(1);
    await expect(screen(canvasElement)).toBeVisible();
  },
};

/** While the next page loads, the button spins and says so. */
export const Leaving: Story = {
  args: { leaving: true },
  play: async ({ canvasElement }) => {
    const button = within(screen(canvasElement)).getByRole('button', {
      name: 'Cargando tu cuenta…',
    });
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await expect(button).toBeDisabled();
  },
};
