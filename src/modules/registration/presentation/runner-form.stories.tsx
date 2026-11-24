import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import type { FormAction } from '@/shared/ui/form-state';

import { RunnerForm } from './runner-form';

const action = fn<FormAction>(async () => ({}));

const meta = {
  title: 'Registration/RunnerForm',
  component: RunnerForm,
  tags: ['autodocs'],
  args: {
    action: action as FormAction,
    shirtSizes: ['Size A', 'Size B'],
    submitLabel: 'Continuar al pago',
    anotherLabel: 'Guardar y agregar otro corredor',
    defaultRunnerName: 'Sofía Ramírez',
    runnerHelp: 'Puedes agregar más corredores antes de pagar.',
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RunnerForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The first registration, after a Google sign-in: asks for phone and consent. */
export const CompleteRegistration: Story = {
  args: { askPhone: true, askConsent: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText('Nombre completo del corredor')).toHaveValue(
      'Sofía Ramírez',
    );
    await expect(canvas.getByLabelText('Teléfono')).toBeVisible();
    await expect(canvas.getByRole('checkbox')).toBeVisible();
  },
};

/** Adding a runner asks for neither the phone nor consent. */
export const AddRunner: Story = {
  args: { defaultRunnerName: '' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByLabelText('Teléfono')).toBeNull();
    await expect(canvas.queryByRole('checkbox')).toBeNull();
  },
};

/** The second button tells the server to come back for another runner. */
export const SaveAndAddAnother: Story = {
  play: async ({ canvasElement }) => {
    action.mockClear();
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Guardar y agregar otro corredor' }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    const data = action.mock.calls[0]?.[1] as FormData;
    await expect(data.get('intent')).toBe('another');
  },
};

/** Server errors appear on their fields. */
export const WithErrors: Story = {
  args: {
    action: async () => ({
      fieldErrors: { runnerName: 'errors.registration.runner_name_required' },
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(canvas.getByLabelText('Talla de playera'), 'Size B');
    await userEvent.click(canvas.getByRole('button', { name: 'Continuar al pago' }));
    await expect(await canvas.findByText('Escribe el nombre del corredor.')).toBeVisible();
    await expect(canvas.getByLabelText('Talla de playera')).toHaveValue('Size B');
  },
};

/** Step 2 of 3: the stepper, the fee, the deadline, and the live shirt beside the form. */
export const CompleteRegistrationLayout: Story = {
  args: {
    intro: <h1>Completa tu inscripción</h1>,
    showSteps: true,
    fee: '$100.00',
    changesNote: 'La talla, solo hasta el 1 de enero.',
    askPhone: true,
    askConsent: true,
  },
  decorators: [
    (Story) => (
      <div className="max-w-5xl">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const steps = within(canvas.getByRole('list', { name: 'Pasos de tu inscripción' }));
    await expect(steps.getByText('Tu carrera').closest('li')).toHaveAttribute(
      'aria-current',
      'step',
    );
    await expect(canvas.getByText('Cuota de inscripción (igual para 3K y 5K)')).toBeVisible();
    await expect(canvas.getByText('$100.00')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Continuar al pago · 5K' })).toBeVisible();
    await expect(canvas.getByText('La talla, solo hasta el 1 de enero.')).toBeVisible();
    await userEvent.type(canvas.getByLabelText('Nombre para tu playera'), 'Sofi');
    await expect(canvas.getByText('Vista previa de tu playera')).toBeVisible();
    await expect(canvas.getByRole('figure')).toHaveTextContent('SOFI');
  },
};
