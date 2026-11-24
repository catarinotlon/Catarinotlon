import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { RunnerFields } from './runner-fields';

const meta = {
  title: 'Registration/RunnerFields',
  component: RunnerFields,
  tags: ['autodocs'],
  args: { shirtSizes: ['Size A', 'Size B'], errors: {} },
  decorators: [
    (Story) => (
      <form className="max-w-md">
        <Story />
      </form>
    ),
  ],
} satisfies Meta<typeof RunnerFields>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Defaults to the 5K, as in the mocks. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('radio', { name: '5K' })).toBeChecked();
    await expect(canvas.getByTestId('shirt-name')).toHaveTextContent('NOMBRE');
  },
};

/** The preview follows the shirt name. */
export const LivePreview: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Nombre para tu playera'), 'Sofi');
    await expect(canvas.getByTestId('shirt-name')).toHaveTextContent('SOFI');
  },
};

/** Choosing a distance selects it for the form. */
export const ChooseDistance: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('radio', { name: '3K' }));
    await expect(canvas.getByRole('radio', { name: '3K' })).toBeChecked();
    const form = canvasElement.querySelector('form') as HTMLFormElement;
    await expect(new FormData(form).get('distance')).toBe('3K');
  },
};

/** With the runner's name, for forms that register someone else. */
export const WithRunnerName: Story = {
  args: { showRunnerName: true, defaultRunnerName: 'Sofía Ramírez' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText('Nombre completo del corredor')).toHaveValue(
      'Sofía Ramírez',
    );
  },
};

/** Field errors, as message keys. */
export const WithErrors: Story = {
  args: {
    errors: {
      shirtName: 'errors.registration.shirt_name_required',
      shirtSize: 'errors.registration.invalid_shirt_size',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText('Nombre para tu playera')).toHaveAccessibleDescription(
      'Escribe el nombre para la playera.',
    );
    await expect(canvas.getByLabelText('Talla de playera')).toHaveAttribute('aria-invalid', 'true');
  },
};
