import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import type { FormState } from '@/shared/ui/form-state';

import { ReplaceReceiptForm } from './replace-receipt-form';

type ReplaceReceipt = (input: { pathname: string; paymentId: string }) => Promise<FormState>;

const file = new File(['%PDF'], 'nuevo.pdf', { type: 'application/pdf' });
const label = 'Comprobante de tu Transferencia (SPEI)';

const meta = {
  title: 'Payments/ReplaceReceiptForm',
  component: ReplaceReceiptForm,
  tags: ['autodocs'],
  args: {
    paymentId: 'payment-1',
    mode: 'local',
    userId: 'user-1',
    action: fn<ReplaceReceipt>(async () => ({ done: true })),
    uploader: fn(async () => ({ pathname: 'receipts/user-1/nuevo.pdf' })),
  },
} satisfies Meta<typeof ReplaceReceiptForm>;

export default meta;
type Story = StoryObj<typeof meta>;

async function replace(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await userEvent.upload(canvas.getByLabelText(label), file);
  await expect(canvas.getByText('Archivo listo: nuevo.pdf')).toBeVisible();
  await userEvent.click(canvas.getByRole('button', { name: 'Reemplazar comprobante' }));
  return canvas;
}

/** The new file is sent for the same payment. */
export const Replaces: Story = {
  play: async ({ args, canvasElement }) => {
    await replace(canvasElement);
    await waitFor(() =>
      expect(args.action).toHaveBeenCalledWith({
        pathname: 'receipts/user-1/nuevo.pdf',
        paymentId: 'payment-1',
      }),
    );
  },
};

/** While it uploads, the button shrinks into a spinning circle. */
export const Pending: Story = {
  args: { uploader: fn(() => new Promise<{ pathname: string }>(() => {})) },
  play: async ({ canvasElement }) => {
    const canvas = await replace(canvasElement);
    const button = await canvas.findByRole('button', { name: 'Enviando…' });
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await expect(button).toBeDisabled();
  },
};

/**
 * Once replaced, the circle fills in with a check, the form says so and forgets the
 * file, and the button turns back into a pill for another try.
 */
export const Replaced: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await replace(canvasElement);

    await expect(
      await canvas.findByRole('button', { name: 'Comprobante reemplazado' }),
    ).toBeDisabled();
    await expect(canvas.getByRole('status')).toHaveTextContent('Comprobante reemplazado');
    await expect(canvas.queryByText('Archivo listo: nuevo.pdf')).toBeNull();
    await expect(canvas.getByLabelText(label)).toHaveValue('');

    await waitFor(
      () => expect(canvas.getByRole('button', { name: 'Reemplazar comprobante' })).toBeEnabled(),
      { timeout: 4000 },
    );
    await expect(canvas.getByRole('status')).toHaveTextContent('Comprobante reemplazado');
  },
};

/** Choosing another file clears the confirmation. */
export const NewChoiceClearsConfirmation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await replace(canvasElement);
    await canvas.findByRole('status');

    await userEvent.upload(canvas.getByLabelText(label), file);

    await expect(canvas.queryByRole('status')).toBeNull();
  },
};

/** A refusal shows the error and the pill comes straight back. */
export const Refused: Story = {
  args: { action: fn<ReplaceReceipt>(async () => ({ formError: 'payment.errors.not_in_review' })) },
  play: async ({ canvasElement }) => {
    const canvas = await replace(canvasElement);

    await expect(await canvas.findByRole('alert')).toHaveTextContent('Este pago ya fue revisado.');
    await expect(canvas.getByRole('button', { name: 'Reemplazar comprobante' })).toBeEnabled();
    await expect(canvas.queryByRole('status')).toBeNull();
  },
};
