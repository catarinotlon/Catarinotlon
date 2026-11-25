import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import type { FormAction } from '@/shared/ui/form-state';

import type { AdminRow } from '../application/use-cases/admin-overview';
import { KitPickupPanel, type KitRunner } from './kit-pickup-panel';
import { PaymentReviewPanel, type PaymentReviewData } from './payment-review-panel';
import { RegistrationsTable } from './registrations-table';

const meta = { title: 'Payments/AdminViews', tags: ['autodocs'] } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const rows: AdminRow[] = [
  {
    id: 'a',
    runnerName: 'Sofía Ramírez',
    email: 'sofia@example.test',
    distance: '5K',
    shirtSize: 'Size A',
    shirtName: 'SOFI',
    bibNumber: '48213',
    paymentState: 'paid',
    kitDelivered: true,
    reviewPaymentId: null,
  },
  {
    id: 'b',
    runnerName: 'Emilio Cruz',
    email: 'emilio@example.test',
    distance: '3K',
    shirtSize: 'Size B',
    shirtName: '<b>EMI</b>',
    bibNumber: '31758',
    paymentState: 'in_review',
    kitDelivered: false,
    reviewPaymentId: 'payment-1',
  },
];

const totals = { total: 2, three: 1, five: 1, inReview: 1, pending: 0, kitsDelivered: 1 };

/** The table, with its counts, filters, and actions. */
export const Registrations: Story = {
  render: () => <RegistrationsTable rows={rows} totals={totals} filter={{}} totalRows={2} />,
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: '/es/admin' } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('table', { name: 'Lista de inscripciones' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Editar a Sofía Ramírez' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Revisar pago de Emilio Cruz' })).toBeVisible();
    await expect(canvas.getByText('Mostrando 2 de 2 inscripciones.')).toBeVisible();
    await expect(canvas.getByText('<b>EMI</b>')).toBeVisible();
  },
};

/** No registrations match. */
export const RegistrationsEmpty: Story = {
  render: () => (
    <RegistrationsTable rows={[]} totals={totals} filter={{ query: 'x' }} totalRows={2} />
  ),
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: '/es/admin' } } },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText('No hay inscripciones con esos filtros.'),
    ).toBeVisible();
  },
};

const review: PaymentReviewData = {
  paymentId: 'payment-1',
  status: 'in_review',
  receiptUrl: '/api/receipts/payment-1',
  receiptIsImage: false,
  holderPhone: '5512345678',
  uploadedAt: new Date('2026-01-15T18:00:00.000Z'),
  holderName: 'Emilio Cruz',
  holderEmail: 'emilio@example.test',
  runners: [{ id: 'b', name: 'Emilio Cruz', distance: '5K', bib: '31758' }],
  amountCents: 10000,
  clabe: '002010077777777771',
  concept: 'CATARINOTLON - EMILIO CRUZ',
  rejectionReason: null,
  reviewedAt: null,
};

const confirm = fn<FormAction>(async () => ({ done: true }));

/** Compares the receipt with the expected data, then decides. */
export const ReviewInProgress: Story = {
  render: () => <PaymentReviewPanel data={review} confirmAction={confirm} rejectAction={confirm} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('CATARINOTLON - EMILIO CRUZ')).toBeVisible();
    await expect(canvas.getByText(/5512345678/)).toBeVisible();
    await expect(canvasElement.querySelector('iframe')).toBeNull();
    await expect(canvas.getByText(/Este comprobante es un PDF/)).toBeVisible();
    await expect(canvas.getByText('$100.00')).toBeVisible();
    await expect(canvas.getByText(/12:00\sp\.\sm\./)).toBeVisible();
    await expect(canvas.getByText('Emilio Cruz (5K, n.º 31758)')).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Abrir en tamaño completo' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Confirmar pago' })).toBeVisible();
  },
};

/** Rejecting requires a reason from the server. */
export const RejectNeedsReason: Story = {
  render: () => (
    <PaymentReviewPanel
      data={review}
      confirmAction={confirm}
      rejectAction={async () => ({ fieldErrors: { reason: 'admin.review.reasonRequired' } })}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Rechazar comprobante' }));
    await expect(await canvas.findByText('Escribe el motivo del rechazo.')).toBeVisible();
  },
};

/** Once decided, the outcome shows and no more actions are offered. */
export const ReviewDone: Story = {
  render: () => (
    <PaymentReviewPanel
      data={{ ...review, status: 'rejected', rejectionReason: 'El monto no coincide' }}
      confirmAction={confirm}
      rejectAction={confirm}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Comprobante rechazado')).toBeVisible();
    await expect(canvas.getByText('Motivo: El monto no coincide')).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Confirmar pago' })).toBeNull();
  },
};

const kitRunner: KitRunner = {
  id: 'a',
  runnerName: 'Sofía Ramírez',
  distance: '5K',
  shirtSize: 'Size A',
  shirtName: 'SOFI',
  bibNumber: '48213',
  paymentState: 'paid',
  kitDelivered: false,
  collectedBy: null,
};

const deliver = fn<FormAction>(async () => ({ done: true }));

/** A confirmed runner's kit can be delivered, noting who collects it. */
export const KitReady: Story = {
  render: () => (
    <KitPickupPanel runner={kitRunner} scanned deliverAction={deliver} undoAction={deliver} />
  ),
  play: async ({ canvasElement }) => {
    deliver.mockClear();
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Boleto leído')).toBeVisible();
    await userEvent.type(canvas.getByLabelText('¿Recoge otra persona? (opcional)'), 'Una tía');
    await userEvent.click(canvas.getByRole('button', { name: 'Marcar kit entregado' }));
    await waitFor(() => expect(deliver).toHaveBeenCalled());
    const data = deliver.mock.calls[0]?.[1] as FormData;
    await expect(data.get('collectedBy')).toBe('Una tía');
    await expect(data.get('registrationId')).toBe('a');
  },
};

/** A delivered kit can be undone. */
export const KitDelivered: Story = {
  render: () => (
    <KitPickupPanel
      runner={{ ...kitRunner, kitDelivered: true, collectedBy: 'Una tía' }}
      deliverAction={deliver}
      undoAction={deliver}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Kit entregado')).toBeVisible();
    await expect(canvas.getByText('Recogió: Una tía')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Deshacer' })).toBeVisible();
  },
};

/** An unpaid runner cannot collect a kit. */
export const KitNotConfirmed: Story = {
  render: () => (
    <KitPickupPanel
      runner={{ ...kitRunner, paymentState: 'pending' }}
      deliverAction={deliver}
      undoAction={deliver}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText('Este corredor todavía no tiene el pago confirmado.'),
    ).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Marcar kit entregado' })).toBeNull();
  },
};

async function expectBusy(button: HTMLElement) {
  await expect(button).toHaveAttribute('aria-busy', 'true');
  await expect(button).toBeDisabled();
}

const hang: FormAction = () => new Promise(() => {});

/** Confirming a payment shows that it is working. */
export const ConfirmPending: Story = {
  render: () => <PaymentReviewPanel data={review} confirmAction={hang} rejectAction={hang} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Confirmar pago' }));
    await expectBusy(await canvas.findByRole('button', { name: 'Confirmando pago…' }));
    await expect(canvas.getByRole('button', { name: 'Rechazar comprobante' })).toBeDisabled();
  },
};

/** Rejecting a receipt shows that it is working. */
export const RejectPending: Story = {
  render: () => <PaymentReviewPanel data={review} confirmAction={hang} rejectAction={hang} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Rechazar comprobante' }));
    await expectBusy(await canvas.findByRole('button', { name: 'Rechazando…' }));
  },
};

/** Delivering a kit shows that it is working. */
export const DeliverPending: Story = {
  render: () => <KitPickupPanel runner={kitRunner} deliverAction={hang} undoAction={hang} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Marcar kit entregado' }));
    await expectBusy(await canvas.findByRole('button', { name: 'Registrando entrega…' }));
  },
};

/** Undoing a delivery shows that it is working. */
export const UndoPending: Story = {
  render: () => (
    <KitPickupPanel
      runner={{ ...kitRunner, kitDelivered: true }}
      deliverAction={hang}
      undoAction={hang}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Deshacer' }));
    await expectBusy(await canvas.findByRole('button', { name: 'Deshaciendo…' }));
  },
};

/** A receipt image never appears in a session recording. */
export const ReceiptHiddenFromRecordings: Story = {
  render: () => (
    <PaymentReviewPanel
      data={{ ...review, receiptIsImage: true }}
      confirmAction={confirm}
      rejectAction={confirm}
    />
  ),
  play: async ({ canvasElement }) => {
    const image = within(canvasElement).getByRole('img', { name: /comprobante/i });
    await expect(image.closest('.ph-no-capture')).not.toBeNull();
  },
};
