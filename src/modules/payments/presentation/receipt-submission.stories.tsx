import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { getRouter } from '@storybook/nextjs-vite/navigation.mock';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import type { FormState } from '@/shared/ui/form-state';

import { ReceiptSubmission } from './receipt-submission';

type RecordReceipt = (input: { pathname: string }) => Promise<FormState>;

const file = new File(['%PDF'], 'comprobante.pdf', { type: 'application/pdf' });
const label = 'Comprobante de tu Transferencia (SPEI)';

const meta = {
  title: 'Payments/ReceiptSubmission',
  component: ReceiptSubmission,
  tags: ['autodocs'],
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: '/es/pago' } } },
  args: {
    mode: 'local',
    userId: 'user-1',
    action: fn<RecordReceipt>(async () => ({ done: true })),
    uploader: fn(async () => ({ pathname: 'receipts/user-1/file.pdf' })),
    submitLabel: 'Enviar comprobante',
    next: 'account',
    settleAfterMs: 60_000,
  },
  beforeEach: () => {
    getRouter().push.mockClear();
    getRouter().refresh.mockClear();
  },
} satisfies Meta<typeof ReceiptSubmission>;

export default meta;
type Story = StoryObj<typeof meta>;

async function send(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await userEvent.upload(canvas.getByLabelText(label), file);
  await userEvent.click(canvas.getByRole('button', { name: 'Enviar comprobante' }));
  return within(canvasElement.ownerDocument.body);
}

/** Before sending, only the upload form shows. */
export const Form: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Enviar comprobante' })).toBeVisible();
    await expect(within(canvasElement.ownerDocument.body).queryByRole('dialog')).toBeNull();
  },
};

/** Once recorded, the red full-screen confirmation opens. */
export const Received: Story = {
  play: async ({ canvasElement }) => {
    const page = await send(canvasElement);
    await expect(await page.findByRole('dialog', { name: 'Comprobante recibido' })).toBeVisible();
  },
};

/** From the payment page, the account opens after the pause. */
export const GoesToAccount: Story = {
  args: { settleAfterMs: 20 },
  play: async ({ canvasElement }) => {
    await send(canvasElement);
    await waitFor(() => expect(getRouter().push).toHaveBeenCalledWith('/es/cuenta'));
  },
};

/** On the account page, the page reloads in place after the pause. */
export const RefreshesInPlace: Story = {
  args: { next: 'refresh', settleAfterMs: 20 },
  play: async ({ canvasElement }) => {
    await send(canvasElement);
    await waitFor(() => expect(getRouter().refresh).toHaveBeenCalledTimes(1));
    await expect(getRouter().push).not.toHaveBeenCalled();
  },
};

/** Nobody has to wait: "Continue" moves on at once, and only once. */
export const ContinueNow: Story = {
  play: async ({ canvasElement }) => {
    const page = await send(canvasElement);
    const dialog = await page.findByRole('dialog', { name: 'Comprobante recibido' });

    await userEvent.click(within(dialog).getByRole('button', { name: 'Continuar' }));

    await expect(getRouter().push).toHaveBeenCalledTimes(1);
    await expect(
      within(dialog).getByRole('button', { name: 'Cargando tu cuenta…' }),
    ).toHaveAttribute('aria-busy', 'true');
  },
};

/** A refusal keeps the form, with the error, and goes nowhere. */
export const StaysOnError: Story = {
  args: {
    settleAfterMs: 20,
    action: fn<RecordReceipt>(async () => ({ formError: 'payment.errors.nothing_to_pay' })),
  },
  play: async ({ canvasElement }) => {
    const page = await send(canvasElement);

    await expect(await within(canvasElement).findByRole('alert')).toHaveTextContent(
      'No tienes corredores por pagar.',
    );
    await expect(page.queryByRole('dialog')).toBeNull();
    await expect(getRouter().push).not.toHaveBeenCalled();
  },
};

/** Content around the form, such as a heading and a hint, stays with it. */
export const WithSurroundings: Story = {
  args: {
    className: 'rounded-2xl border-2 border-dashed border-input-border p-4',
    before: <h4 className="m-0 font-display text-lg font-bold uppercase">¿Ya pagaste?</h4>,
    after: <p className="m-0 text-sm text-muted-foreground">Imagen o PDF del comprobante.</p>,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: '¿Ya pagaste?' })).toBeVisible();
    await expect(canvas.getByText('Imagen o PDF del comprobante.')).toBeVisible();
  },
};
