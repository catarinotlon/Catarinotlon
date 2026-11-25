import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { getRouter } from '@storybook/nextjs-vite/navigation.mock';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import type { FormAction } from '@/shared/ui/form-state';
import { filmQrCode } from '@/test/fake-camera';

import type { KitRunner } from './kit-pickup-panel';
import { KitPickupScanner } from './kit-pickup-scanner';

const TICKET_ID = '3f2b8c1e-7a4d-4e9f-b6c2-1d5a9e8f0b37';

const runner: KitRunner = {
  id: 'reg-1',
  runnerName: 'Sofía Ramírez',
  distance: '5K',
  shirtSize: 'Size A',
  shirtName: 'SOFI',
  bibNumber: '48213',
  paymentState: 'paid',
  kitDelivered: false,
  collectedBy: null,
  deliveredAt: null,
};

const deliver = fn<FormAction>(async () => ({ done: true }));
const undo = fn<FormAction>(async () => ({ done: true }));

const meta = {
  title: 'Payments/KitPickupScanner',
  component: KitPickupScanner,
  tags: ['autodocs'],
  args: { query: '', scan: null, deliverAction: deliver, undoAction: undo },
  beforeEach: () => {
    getRouter().replace.mockClear();
    deliver.mockClear();
    undo.mockClear();
  },
} satisfies Meta<typeof KitPickupScanner>;

export default meta;
type Story = StoryObj<typeof meta>;

const resultOf = (canvasElement: HTMLElement) =>
  within(within(canvasElement).getByRole('region', { name: 'Resultado del boleto' }));

/** The result slides in, so it becomes visible after its entrance. */
const appears = (element: HTMLElement) => waitFor(() => expect(element).toBeVisible());

const replacedWith = () => getRouter().replace.mock.calls.map((call) => String(call[0]));

/** Before anything is scanned, the result area says what to do. */
export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Escanear boleto' })).toBeVisible();
    await expect(
      canvas.getByText('Escanea un boleto o busca a un corredor para ver su kit.'),
    ).toBeInTheDocument();
  },
};

/** No search yet: the page passes no results, which must not hide the empty state. */
export const EmptyWithoutSearch: Story = {
  args: { children: '' },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText('Escanea un boleto o busca a un corredor para ver su kit.'),
    ).toBeInTheDocument();
  },
};

/** A scanned ticket of a paid runner says to deliver the kit. */
export const ScannedReady: Story = {
  args: { scan: { ticketId: TICKET_ID, runner } },
  play: async ({ canvasElement }) => {
    const result = resultOf(canvasElement);
    await appears(result.getByRole('heading', { name: 'Entregar kit' }));
    await expect(result.getByText('Sofía Ramírez')).toBeVisible();
    await expect(result.getByRole('button', { name: 'Marcar kit entregado' })).toBeVisible();
  },
};

/** A ticket nobody registered with says so, and shows which ticket was read. */
export const ScannedNotFound: Story = {
  args: { scan: { ticketId: TICKET_ID, runner: null } },
  play: async ({ canvasElement }) => {
    const result = resultOf(canvasElement);
    await appears(result.getByRole('heading', { name: 'Boleto no encontrado' }));
    await expect(result.getByText('3f2b8c1e…')).toBeVisible();
  },
};

/** Reading a ticket opens it and says it is being checked until the server answers. */
export const ReadsATicket: Story = {
  beforeEach: () => filmQrCode(TICKET_ID),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Escanear boleto' }));
    await waitFor(
      () => expect(replacedWith().some((href) => href.includes(TICKET_ID))).toBe(true),
      {
        timeout: 5000,
      },
    );
    await appears(resultOf(canvasElement).getByRole('heading', { name: 'Validando boleto…' }));
  },
};

/** A QR code that is not a ticket is turned away at once, without asking the server. */
export const ReadsSomethingElse: Story = {
  beforeEach: () => filmQrCode('https://example.com/'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Escanear boleto' }));
    await appears(
      await canvas.findByText('Ese QR no es un boleto de Catarinotlón', {}, { timeout: 5000 }),
    );
    await expect(getRouter().replace).not.toHaveBeenCalled();
    await expect(canvas.getByRole('button', { name: 'Detener cámara' })).toBeVisible();
  },
};

/** Delivering confirms it, goes back to the camera, and offers a few seconds to undo. */
export const DeliverThenUndo: Story = {
  args: { scan: { ticketId: TICKET_ID, runner } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const result = resultOf(canvasElement);
    await userEvent.click(result.getByRole('button', { name: 'Marcar kit entregado' }));
    await appears(await result.findByRole('heading', { name: 'Kit entregado' }));

    const toast = await canvas.findByRole('status', {}, { timeout: 4000 });
    await waitFor(() => expect(toast).toHaveTextContent('Kit de Sofía Ramírez entregado'));
    await expect(replacedWith().at(-1)).not.toContain('ticket=');

    await userEvent.click(within(toast).getByRole('button', { name: 'Deshacer' }));
    await waitFor(() => expect(undo).toHaveBeenCalled());
    const data = undo.mock.calls[0]?.[1] as FormData;
    await expect(data.get('registrationId')).toBe('reg-1');
    await waitFor(() => expect(canvas.queryByText('Kit de Sofía Ramírez entregado')).toBeNull());
  },
};

/** "Scan next" closes the result and clears the ticket from the address. */
export const ScanNext: Story = {
  args: { scan: { ticketId: TICKET_ID, runner: { ...runner, kitDelivered: true } } },
  play: async ({ canvasElement }) => {
    const result = resultOf(canvasElement);
    await userEvent.click(result.getByRole('button', { name: 'Escanear siguiente' }));
    await waitFor(() => expect(replacedWith().at(-1)).not.toContain('ticket='));
  },
};

/** Runner data and the camera stay out of session recordings. */
export const HiddenFromRecordings: Story = {
  args: { scan: { ticketId: TICKET_ID, runner } },
  play: async ({ canvasElement }) => {
    const result = resultOf(canvasElement);
    await expect(result.getByText('Sofía Ramírez').closest('[data-private]')).not.toBeNull();
    const scan = within(canvasElement).getByRole('button', { name: 'Escanear boleto' });
    await expect(scan.closest('.ph-no-capture')).not.toBeNull();
  },
};
