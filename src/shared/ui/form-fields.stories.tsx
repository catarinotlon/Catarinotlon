import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { FormAlert, SelectField, TextAreaField, TextField } from './form-fields';

const meta = {
  title: 'Shared/FormFields',
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A labeled text input. */
export const Text: Story = {
  render: () => <TextField label="Correo electrónico" name="email" type="email" />,
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText('Correo electrónico');
    await userEvent.type(input, 'a@example.test');
    await expect(input).toHaveValue('a@example.test');
    await expect(input.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  },
};

/** Help text is announced with the input. */
export const WithHelp: Story = {
  render: () => <TextField label="Contraseña" name="password" help="Al menos 8 caracteres." />,
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText('Contraseña');
    await expect(input).toHaveAccessibleDescription('Al menos 8 caracteres.');
  },
};

/** An error marks the input invalid and is announced with it. */
export const WithError: Story = {
  render: () => <TextField label="Nombre" name="name" error="Este campo es obligatorio." />,
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText('Nombre');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAccessibleDescription('Este campo es obligatorio.');
  },
};

/** A native select with a placeholder that cannot be submitted. */
export const Select: Story = {
  render: () => (
    <SelectField
      label="Talla"
      name="size"
      placeholder="Elige tu talla"
      options={['Size A', 'Size B']}
    />
  ),
  play: async ({ canvasElement }) => {
    const select = within(canvasElement).getByLabelText('Talla');
    await expect(select).toHaveValue('');
    await userEvent.selectOptions(select, 'Size B');
    await expect(select).toHaveValue('Size B');
  },
};

/** A form-level error. */
export const Alert: Story = {
  render: () => <FormAlert>Algo salió mal.</FormAlert>,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('alert')).toHaveTextContent('Algo salió mal.');
  },
};

/** A link can sit on the label's line, such as "forgot your password". */
export const LabelAction: Story = {
  render: () => (
    <TextField label="Contraseña" name="password" labelAction={<a href="#forgot">¿Olvidaste?</a>} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const label = canvas.getByText('Contraseña').getBoundingClientRect();
    const link = canvas.getByRole('link', { name: '¿Olvidaste?' }).getBoundingClientRect();
    await expect(Math.abs(label.top - link.top)).toBeLessThan(12);
    await expect(canvas.getByLabelText('Contraseña')).toHaveAttribute('name', 'password');
  },
};

/** A labeled multi-line input. */
export const TextArea: Story = {
  render: () => <TextAreaField label="Entrega de kits" name="kit" defaultValue="Sede" />,
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByLabelText('Entrega de kits');
    await expect(field.tagName).toBe('TEXTAREA');
    await expect(field).toHaveValue('Sede');
  },
};
