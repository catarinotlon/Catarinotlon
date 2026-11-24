import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import type { FormState } from '@/shared/ui/form-state';

import { SettingForm, ShirtNameEditor } from './account-forms';
import { AdminShell } from './admin-shell';
import { KitPickupSearch } from './kit-pickup-search';
import { ReplaceReceiptForm } from './replace-receipt-form';

const meta = {
  title: 'Payments/AdminChrome',
  tags: ['autodocs'],
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: '/es/admin' } } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every admin page shares this navigation. */
export const Shell: Story = {
  render: () => <AdminShell>Contenido</AdminShell>,
  play: async ({ canvasElement }) => {
    const nav = within(within(canvasElement).getByRole('navigation', { name: 'Administración' }));
    await expect(nav.getByRole('link', { name: 'Inscripciones' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Entrega de kits' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Configuración' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Inscripciones' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(nav.getByRole('link', { name: 'Configuración' })).not.toHaveAttribute(
      'aria-current',
    );
    await expect(
      within(within(canvasElement).getByRole('contentinfo')).getByText(/Panel de administración/),
    ).toBeVisible();
  },
};

/** Finds a runner by QR code, name, or bib number. */
export const KitSearch: Story = {
  render: () => <KitPickupSearch query="48213" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Escanear boleto' })).toBeVisible();
    await expect(canvas.getByLabelText('O busca por nombre o número de corredor')).toHaveValue(
      '48213',
    );
  },
};

const replace = fn<(input: { pathname: string; paymentId: string }) => Promise<FormState>>(
  async () => ({ done: true }),
);

/** Replacing a receipt keeps it on the same payment. */
export const ReplaceReceipt: Story = {
  render: () => (
    <ReplaceReceiptForm paymentId="payment-1" mode="local" userId="user-1" action={replace} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Reemplazar comprobante' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Reemplazar comprobante' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'Elige el archivo de tu comprobante.',
    );
    await expect(replace).not.toHaveBeenCalled();
  },
};

const saveName = fn(async (_state: FormState, _data: FormData): Promise<FormState> => ({
  fieldErrors: { shirtName: 'errors.registration.shirt_name_required' },
}));

/** A rejected name keeps what was typed and shows the error. */
export const ShirtNameError: Story = {
  render: () => <ShirtNameEditor registrationId="a" shirtName="SOFI" action={saveName} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Guardar nombre' }));
    await expect(await canvas.findByText('Escribe el nombre para la playera.')).toBeVisible();
    await expect(canvas.getByLabelText('Nombre en tu playera')).toHaveValue('SOFI');
  },
};

const saveDistance = fn(async (_state: FormState, _data: FormData): Promise<FormState> => ({
  done: true,
}));

/** Changes one option of the selected runner. */
export const ChangeOption: Story = {
  render: () => (
    <SettingForm
      registrationId="a"
      label="Distancia"
      name="distance"
      options={['3K', '5K']}
      value="5K"
      submitLabel="Cambiar distancia"
      success="Guardamos la distancia."
      action={saveDistance}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(canvas.getByLabelText('Distancia'), '3K');
    await userEvent.click(canvas.getByRole('button', { name: 'Cambiar distancia' }));
    await waitFor(() => expect(saveDistance).toHaveBeenCalled());
    const data = saveDistance.mock.calls[0]?.[1] as FormData;
    await expect(data.get('distance')).toBe('3K');
    await expect(data.get('registrationId')).toBe('a');
    await expect(await canvas.findByRole('status')).toHaveTextContent('Guardamos la distancia.');
  },
};

/** Every admin page shows personal data, so recordings hide its content. */
export const ShellHiddenFromRecordings: Story = {
  render: () => <AdminShell>Contenido</AdminShell>,
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText('Contenido').closest('[data-private]'),
    ).not.toBeNull();
  },
};
