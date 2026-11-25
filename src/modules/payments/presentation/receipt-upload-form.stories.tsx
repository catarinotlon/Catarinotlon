import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import type { FormState } from '@/shared/ui/form-state';

import { ReceiptUploadForm } from './receipt-upload-form';

type RecordReceipt = (input: { pathname: string }) => Promise<FormState>;

const file = new File(['%PDF'], 'comprobante.pdf', { type: 'application/pdf' });
const label = 'Comprobante de tu Transferencia (SPEI)';

const meta = {
  title: 'Payments/ReceiptUploadForm',
  component: ReceiptUploadForm,
  tags: ['autodocs'],
  args: {
    mode: 'local',
    userId: 'user-1',
    action: fn<RecordReceipt>(async () => ({ done: true })),
    uploader: fn(async () => ({ pathname: 'receipts/user-1/file.pdf' })),
    submitLabel: 'Enviar comprobante',
  },
} satisfies Meta<typeof ReceiptUploadForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Uploads the file, then records it on the server. */
export const Upload: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.upload(canvas.getByLabelText(label), file);
    await expect(canvas.getByText('Archivo listo: comprobante.pdf')).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Enviar comprobante' }));

    await waitFor(() =>
      expect(args.action).toHaveBeenCalledWith({
        pathname: 'receipts/user-1/file.pdf',
      }),
    );
  },
};

/** Once the server has recorded the receipt, the form says it is done. */
export const Done: Story = {
  args: { onDone: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.upload(canvas.getByLabelText(label), file);
    await userEvent.click(canvas.getByRole('button', { name: 'Enviar comprobante' }));

    await waitFor(() => expect(args.onDone).toHaveBeenCalledTimes(1));
  },
};

/** A refusal from the server is not done. */
export const NotDoneOnError: Story = {
  args: {
    onDone: fn(),
    action: fn<RecordReceipt>(async () => ({ formError: 'payment.errors.nothing_to_pay' })),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.upload(canvas.getByLabelText(label), file);
    await userEvent.click(canvas.getByRole('button', { name: 'Enviar comprobante' }));

    await canvas.findByRole('alert');
    await expect(args.onDone).not.toHaveBeenCalled();
  },
};

/** Submitting with no file asks for one and uploads nothing. */
export const MissingFile: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Enviar comprobante' }));

    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'Elige el archivo de tu comprobante.',
    );
    await expect(args.uploader).not.toHaveBeenCalled();
  },
};

/** A file of the wrong type is refused before uploading. */
export const WrongType: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText(label);
    await userEvent.upload(input, new File(['x'], 'virus.exe', { type: 'application/zip' }), {
      applyAccept: false,
    });
    await userEvent.click(canvas.getByRole('button', { name: 'Enviar comprobante' }));

    await expect(await canvas.findByRole('alert')).toHaveTextContent('Sube una imagen');
    await expect(args.uploader).not.toHaveBeenCalled();
  },
};

/** A failed upload is reported and can be retried. */
export const UploadFails: Story = {
  args: {
    uploader: fn(async () => {
      throw new Error('network');
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.upload(canvas.getByLabelText(label), file);
    await userEvent.click(canvas.getByRole('button', { name: 'Enviar comprobante' }));

    await expect(await canvas.findByRole('alert')).toHaveTextContent('No pudimos subir');
    await expect(canvas.getByRole('button', { name: 'Enviar comprobante' })).toBeEnabled();
  },
};

/** A refusal from the server is shown. */
export const ServerError: Story = {
  args: { action: fn<RecordReceipt>(async () => ({ formError: 'payment.errors.nothing_to_pay' })) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.upload(canvas.getByLabelText(label), file);
    await userEvent.click(canvas.getByRole('button', { name: 'Enviar comprobante' }));

    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'No tienes corredores por pagar.',
    );
  },
};

/** The main upload action is a red pill. */
export const PrimaryPill: Story = {
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button');
    await expect(button).toHaveClass('rounded-full', 'uppercase', 'bg-primary');
  },
};

/** On the account page the pill is black. */
export const InversePill: Story = {
  args: { submitTone: 'inverse' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button')).toHaveClass('bg-inverse');
  },
};

/** Replacing a receipt is a secondary, outlined action. */
export const OutlinePill: Story = {
  args: { submitTone: 'outline' },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button');
    await expect(button).toHaveClass('rounded-full', 'border-2');
    await expect(button).not.toHaveClass('bg-primary');
  },
};

/** The dashed drop area holds only the file field, with the action below it. */
export const DashedField: Story = {
  args: { dashed: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const box = canvas
      .getByLabelText('Comprobante de tu Transferencia (SPEI)')
      .closest('.border-dashed');
    await expect(box).not.toBeNull();
    await expect(box?.contains(canvas.getByRole('button'))).toBe(false);
  },
};

async function expectBusy(button: HTMLElement) {
  await expect(button).toHaveAttribute('aria-busy', 'true');
  await expect(button).toBeDisabled();
}

/** While the file uploads, the button spins and says so. */
export const UploadPending: Story = {
  args: { uploader: fn(() => new Promise<{ pathname: string }>(() => {})) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.upload(canvas.getByLabelText(label), file);
    await userEvent.click(canvas.getByRole('button', { name: 'Enviar comprobante' }));
    await expectBusy(await canvas.findByRole('button', { name: 'Enviando…' }));
  },
};
