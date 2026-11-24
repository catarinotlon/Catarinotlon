import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { AccountView, type AccountRunner, type AccountViewProps } from './account-view';

const QR = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const runner = (overrides: Partial<AccountRunner> = {}): AccountRunner => ({
  id: 'a',
  runnerName: 'Sofía Ramírez',
  distance: '5K',
  bibNumber: '48213',
  shirtName: 'SOFI',
  shirtSize: 'Size A',
  fee: '$100.00',
  stage: 'confirmed',
  rejectionReason: null,
  ticket: { pdfUrl: '/api/tickets/ticket-a/pdf?locale=es', qrDataUrl: QR },
  receipt: null,
  ...overrides,
});

const props: AccountViewProps = {
  holder: { name: 'Sofía Ramírez', email: 'sofia@example.test', phone: '5500000000' },
  signInMethod: 'password',
  saveAccount: async () => ({ done: true }),
  runners: [runner()],
  selectedId: 'a',
  shirtSizes: ['Size A', 'Size B'],
  sizeDeadline: null,
  sizeLocked: false,
  facts: { date: null, venue: null, kitPickup: null, routeMapUrl: null, start: null },
  uploadMode: 'local',
  userId: 'user-1',
  paymentOpen: true,
  saveShirtName: async () => ({ done: true }),
  saveDistance: async () => ({ done: true }),
  saveShirtSize: async () => ({ done: true }),
  recordReceipt: async () => ({ done: true }),
  replaceReceipt: async () => ({ done: true }),
};

const meta = {
  title: 'Payments/AccountView',
  component: AccountView,
  tags: ['autodocs'],
  args: props,
} satisfies Meta<typeof AccountView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A confirmed runner sees the ticket with its QR and PDF download. */
export const Confirmed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Tu boleto' })).toBeVisible();
    await expect(canvas.getByRole('img', { name: 'Código QR del boleto' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Descargar boleto (PDF)' })).toHaveAttribute(
      'href',
      '/api/tickets/ticket-a/pdf?locale=es',
    );
  },
};

/** The ticket shows the bib large, and the shirt says when it is delivered. */
export const TicketAndShirtDetails: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Corredor n.º')).toBeVisible();
    await expect(canvas.getByText('Con tu kit')).toBeVisible();
    await expect(canvas.getByText('Correo y contraseña')).toBeVisible();
  },
};

/** An account created with Google says so. */
export const GoogleAccount: Story = {
  args: { signInMethod: 'google' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Cuenta de Google')).toBeVisible();
  },
};

/** The holder can correct their name and phone. */
export const EditDetails: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Editar datos' }));
    const phone = canvas.getByLabelText('Teléfono');
    await expect(phone).toHaveValue('5500000000');
    await userEvent.clear(phone);
    await userEvent.type(phone, '5511111111');
    await userEvent.click(canvas.getByRole('button', { name: 'Guardar datos' }));
    await expect(await canvas.findByText('Guardamos tus datos.')).toBeVisible();
  },
};

/** While a payment is in review, the runner can message the administrator. */
export const ReviewContact: Story = {
  args: {
    whatsappUrl: 'https://wa.me/525500000000',
    runners: [
      runner({
        stage: 'payment_in_review',
        ticket: null,
        receipt: { paymentId: 'p', url: '/r', uploadedAt: new Date('2026-01-15T18:00:00.000Z') },
      }),
    ],
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('link', { name: 'Chatear por WhatsApp' }),
    ).toHaveAttribute('href', 'https://wa.me/525500000000');
  },
};

/** The account's receipt upload explains what to attach. */
export const UploadHelp: Story = {
  args: { runners: [runner({ stage: 'pending_payment', ticket: null })] },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText('Imagen o PDF del comprobante de tu Transferencia (SPEI).'),
    ).toBeVisible();
  },
};

/** The picker always shows, even with one runner, with the add card. */
export const PickerWithOneRunner: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Tus corredores' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: /Agregar otro corredor/ })).toBeVisible();
    await expect(canvas.getByRole('link', { name: /Sofía Ramírez/ })).toHaveAttribute(
      'aria-current',
      'true',
    );
  },
};

/** Everything below the picker belongs to the selected runner. */
export const TwoRunnersNeverMixed: Story = {
  args: {
    runners: [
      runner(),
      runner({
        id: 'b',
        runnerName: 'Mateo Ramírez',
        distance: '3K',
        bibNumber: '20957',
        shirtName: 'TEO',
        stage: 'pending_payment',
        ticket: null,
      }),
    ],
    selectedId: 'b',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('selected-runner')).toHaveTextContent('Mateo Ramírez');
    await expect(canvas.getByTestId('shirt-name')).toHaveTextContent('TEO');
    await expect(canvas.queryByRole('heading', { name: 'Tu boleto' })).toBeNull();
    await expect(canvas.getByRole('heading', { name: 'Te falta un paso' })).toBeVisible();
  },
};

/** While unpaid, the account shows how to pay and the receipt upload. */
export const PendingPayment: Story = {
  args: { runners: [runner({ stage: 'pending_payment', ticket: null })] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('link', { name: 'Ver datos para transferir' })).toBeVisible();
    await expect(canvas.getByText('$100.00')).toBeVisible();
    await expect(canvas.getAllByText('Pago pendiente').at(-1)).toHaveClass('bg-gold');
    await expect(canvas.getByRole('button', { name: 'Enviar comprobante' })).toBeVisible();
  },
};

/** While payment is closed, nobody reaches the transfer data. */
export const PendingWhilePaymentClosed: Story = {
  args: { paymentOpen: false, runners: [runner({ stage: 'pending_payment', ticket: null })] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Inscripciones próximamente')).toBeVisible();
    await expect(canvas.queryByRole('link', { name: 'Ver datos para transferir' })).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Enviar comprobante' })).toBeNull();
  },
};

/** In review, the uploaded file shows and can be replaced. */
export const InReview: Story = {
  args: {
    runners: [
      runner({
        stage: 'payment_in_review',
        ticket: null,
        receipt: {
          paymentId: 'payment-1',
          url: '/api/receipts/payment-1',
          uploadedAt: new Date('2026-01-15T18:00:00.000Z'),
        },
      }),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Estamos validando tu pago' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Ver comprobante' })).toBeVisible();
    const replace = canvas.getByRole('button', { name: 'Reemplazar comprobante' });
    await expect(replace).toBeVisible();
    await expect(replace).not.toHaveClass('bg-primary');
    await expect(
      canvas.getByRole('heading', { name: 'Estamos validando tu pago' }).closest('section'),
    ).not.toHaveClass('border-gold');
    await expect(canvas.getByRole('heading', { level: 1, name: 'Hola, Sofía' })).toBeVisible();
  },
};

/** After a rejection, the reason shows and a new receipt is requested. */
export const Rejected: Story = {
  args: {
    runners: [
      runner({ stage: 'receipt_rejected', ticket: null, rejectionReason: 'El monto no coincide' }),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No pudimos validar tu comprobante')).toBeVisible();
    await expect(canvas.getByText('Motivo: El monto no coincide')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Enviar comprobante' })).toBeVisible();
  },
};

/** The shirt name can be edited, with a live preview. */
export const EditShirtName: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Nombre en tu playera');
    await userEvent.clear(input);
    await userEvent.type(input, 'Peque');
    await expect(canvas.getByTestId('shirt-name')).toHaveTextContent('PEQUE');
    await userEvent.click(canvas.getByRole('button', { name: 'Guardar nombre' }));
    await waitFor(() =>
      expect(canvas.getByRole('status')).toHaveTextContent('Guardamos el nombre de tu playera.'),
    );
  },
};

/** After the deadline the size can no longer be changed. */
export const SizeLocked: Story = {
  args: { sizeLocked: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button', { name: 'Cambiar talla' })).toBeNull();
  },
};

async function expectBusy(button: HTMLElement) {
  await expect(button).toHaveAttribute('aria-busy', 'true');
  await expect(button).toBeDisabled();
}

const hang = () => new Promise<never>(() => {});

/** Saving the account details shows that it is working. */
export const SaveDetailsPending: Story = {
  args: { saveAccount: hang },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Editar datos' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Guardar datos' }));
    await expectBusy(await canvas.findByRole('button', { name: 'Guardando…' }));
  },
};

/** Saving the shirt name shows that it is working. */
export const SaveShirtNamePending: Story = {
  args: { saveShirtName: hang },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Guardar nombre' }));
    await expectBusy(await canvas.findByRole('button', { name: 'Guardando…' }));
  },
};
