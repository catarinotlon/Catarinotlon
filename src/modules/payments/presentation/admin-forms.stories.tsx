import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { EMPTY_SETTINGS } from '@/modules/event';
import type { FormAction } from '@/shared/ui/form-state';

import { AdminRegistrationForm } from './admin-registration-form';
import { EventSettingsForm } from './event-settings-form';
import { TicketScanner } from './ticket-scanner';

const meta = { title: 'Payments/AdminForms', tags: ['autodocs'] } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const save = fn<FormAction>(async () => ({ done: true }));

const existing = {
  id: 'reg-1',
  runnerName: 'Sofía Ramírez',
  distance: '5K' as const,
  shirtSize: 'Size A',
  shirtName: 'SOFI',
};

/** Editing shows the account, the payment, the kit, and a live shirt. */
export const EditSummary: Story = {
  render: () => (
    <AdminRegistrationForm
      mode="edit"
      action={save}
      shirtSizes={['Size A']}
      initial={existing}
      summary={{
        account: 'Sofía Ramírez · sofia@example.test',
        paymentState: 'paid',
        kitDelivered: true,
        bibNumber: '48213',
      }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Sofía Ramírez · sofia@example.test')).toBeVisible();
    await expect(canvas.getByText('Pagado')).toBeVisible();
    await expect(canvas.getByText('Entregado')).toBeVisible();
    await expect(canvas.getByText('48213')).toBeVisible();
    const name = canvas.getByLabelText('Nombre para la playera');
    await userEvent.clear(name);
    await userEvent.type(name, 'NUEVA');
    await expect(canvas.getByRole('figure')).toHaveTextContent('NUEVA');
  },
};

/** A new registration says its number is assigned on save. */
export const NewSummary: Story = {
  render: () => <AdminRegistrationForm mode="new" action={save} shirtSizes={['Size A']} />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Se asigna al guardar')).toBeVisible();
  },
};

/** Editing prefills the runner and offers no payment checkbox. */
export const EditRegistration: Story = {
  render: () => (
    <AdminRegistrationForm
      mode="edit"
      action={save}
      shirtSizes={['Size A', 'Size B']}
      initial={existing}
    />
  ),
  play: async ({ canvasElement }) => {
    save.mockClear();
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText('Nombre completo del corredor')).toHaveValue(
      'Sofía Ramírez',
    );
    await expect(canvas.getByLabelText('Talla de playera')).toHaveValue('Size A');
    await expect(canvas.queryByRole('checkbox')).toBeNull();
    await userEvent.selectOptions(canvas.getByLabelText('Talla de playera'), 'Size B');
    await userEvent.click(canvas.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(save).toHaveBeenCalled());
    const data = save.mock.calls[0]?.[1] as FormData;
    await expect(data.get('registrationId')).toBe('reg-1');
    await expect(data.get('shirtSize')).toBe('Size B');
    await expect(await canvas.findByRole('status')).toHaveTextContent('Guardamos los cambios.');
  },
};

/** A size no longer on offer stays selectable, so an edit does not lose it. */
export const EditKeepsRetiredSize: Story = {
  render: () => (
    <AdminRegistrationForm
      mode="edit"
      action={save}
      shirtSizes={['Size B']}
      initial={{ ...existing, shirtSize: 'Retired size' }}
    />
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText('Talla de playera')).toHaveValue(
      'Retired size',
    );
  },
};

/** A manual registration asks for contact data and the payment flag. */
export const NewRegistration: Story = {
  render: () => <AdminRegistrationForm mode="new" action={save} shirtSizes={['Size A']} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText('Correo (para enviarle su boleto)')).toBeVisible();
    await expect(canvas.getByLabelText('Teléfono')).toBeVisible();
    await expect(canvas.getByRole('checkbox', { name: /Ya recibí el pago/ })).not.toBeChecked();
    await expect(canvas.getByRole('button', { name: 'Inscribir corredor' })).toBeVisible();
  },
};

const settingsAction = fn<FormAction>(async () => ({ done: true }));

/** With nothing set, it says payment is closed and lists what is missing. */
export const SettingsEmpty: Story = {
  render: () => (
    <EventSettingsForm
      values={EMPTY_SETTINGS}
      missing={['feeCents', 'bank']}
      action={settingsAction}
      history={[]}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('El pago todavía no está abierto')).toBeVisible();
    await expect(canvas.getByText('Falta capturar: Precio, Datos de pago')).toBeVisible();
    await expect(canvas.getAllByText('Sin capturar')).toHaveLength(3);
    await expect(canvas.getByText('Todavía no hay cambios.')).toBeVisible();
  },
};

/** Each section saves on its own and names itself to the server. */
export const SettingsSavesSection: Story = {
  render: () => (
    <EventSettingsForm values={EMPTY_SETTINGS} missing={[]} action={settingsAction} history={[]} />
  ),
  play: async ({ canvasElement }) => {
    settingsAction.mockClear();
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Precio (igual para 3K y 5K)'), '350');
    await userEvent.type(canvas.getByLabelText('Tallas disponibles'), 'Size A, Size B');
    await userEvent.click(canvas.getByRole('button', { name: 'Guardar inscripción' }));
    await waitFor(() => expect(settingsAction).toHaveBeenCalled());
    const data = settingsAction.mock.calls[0]?.[1] as FormData;
    await expect(data.get('section')).toBe('registration');
    await expect(data.get('fee')).toBe('350');
  },
};

/** Changing the bank data asks for the admin's password. */
export const SettingsBankNeedsPassword: Story = {
  render: () => (
    <EventSettingsForm values={EMPTY_SETTINGS} missing={[]} action={settingsAction} history={[]} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByLabelText('Tu contraseña, para confirmar el cambio')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Capturar datos de pago' }));
    await expect(canvas.getByLabelText('Tu contraseña, para confirmar el cambio')).toHaveAttribute(
      'type',
      'password',
    );
  },
};

/** The history shows what changed, who changed it, and when. */
export const SettingsHistory: Story = {
  render: () => (
    <EventSettingsForm
      values={EMPTY_SETTINGS}
      missing={[]}
      action={settingsAction}
      history={[
        {
          id: 'v1',
          changedFields: ['feeCents', 'venue'],
          changedBy: 'Admin One',
          createdAt: new Date('2026-01-15T18:00:00.000Z'),
        },
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/Admin One: Precio, Sede/)).toBeVisible();
  },
};

/** Without camera support, it explains the fallback. */
export const ScannerUnavailable: Story = {
  render: () => <TicketScanner onTicket={fn()} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    Reflect.deleteProperty(window, 'BarcodeDetector');
    await userEvent.click(canvas.getByRole('button', { name: 'Escanear boleto' }));
    await expect(
      await canvas.findByText(
        'Este navegador no puede leer códigos QR. Busca por nombre o número.',
      ),
    ).toBeVisible();
  },
};

/** Kit pickup details take several lines. */
export const SettingsKitTextArea: Story = {
  render: () => (
    <EventSettingsForm values={EMPTY_SETTINGS} missing={[]} action={settingsAction} history={[]} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText('Entrega de kits (español)').tagName).toBe('TEXTAREA');
    await expect(canvas.getByLabelText('Entrega de kits (inglés)').tagName).toBe('TEXTAREA');
  },
};
