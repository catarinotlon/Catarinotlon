import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import type { FormAction } from '@/shared/ui/form-state';

import { RemoveRunnerButton } from './remove-runner-button';

const meta = {
  title: 'Registration/RemoveRunnerButton',
  component: RemoveRunnerButton,
  tags: ['autodocs'],
  args: {
    registrationId: 'reg-2',
    runnerName: 'Mateo Prueba',
    from: 'payment',
    action: fn<FormAction>(async () => ({})),
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RemoveRunnerButton>;

export default meta;
type Story = StoryObj<typeof meta>;

async function askToRemove(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByRole('button', { name: 'Quitar a Mateo Prueba' }));
  return canvas;
}

/** A quiet button that names the runner it removes. Nothing is sent yet. */
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Quitar a Mateo Prueba' })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Sí, quitar' })).toBeNull();
    await expect(args.action).not.toHaveBeenCalled();
  },
};

/** The first press only asks; the runner is removed after confirming. */
export const AsksFirst: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = await askToRemove(canvasElement);

    await expect(canvas.getByText('¿Quitar a Mateo Prueba de tu cuenta?')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Sí, quitar' })).toHaveFocus();
    await expect(args.action).not.toHaveBeenCalled();
  },
};

/** Cancelling goes back to the button, with the focus on it. */
export const Cancels: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = await askToRemove(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Cancelar' }));

    await expect(canvas.getByRole('button', { name: 'Quitar a Mateo Prueba' })).toHaveFocus();
    await expect(args.action).not.toHaveBeenCalled();
  },
};

/** Confirming sends the runner and the page to return to. */
export const Removes: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = await askToRemove(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Sí, quitar' }));

    await waitFor(() => expect(args.action).toHaveBeenCalledTimes(1));
    const data = lastFormData(args.action);
    await expect(data.get('registrationId')).toBe('reg-2');
    await expect(data.get('from')).toBe('payment');
  },
};

/** A runner whose receipt was sent meanwhile cannot be removed; the reason shows. */
export const NotRemovable: Story = {
  args: {
    action: fn<FormAction>(async () => ({ formError: 'errors.registration.not_removable' })),
  },
  play: async ({ canvasElement }) => {
    const canvas = await askToRemove(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Sí, quitar' }));

    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'Ya no puedes quitar a este corredor',
    );
  },
};

/** The runner's name is personal data, so recordings mask it. */
export const HiddenFromRecordings: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await askToRemove(canvasElement);
    await expect(
      canvas.getByText('¿Quitar a Mateo Prueba de tu cuenta?').closest('[data-private]'),
    ).not.toBeNull();
  },
};

/**
 * While the server works, the button says so and cannot be pressed twice. It stays last: its
 * action never settles, and React would hold any later story's action behind it.
 */
export const Pending: Story = {
  args: { action: fn<FormAction>(() => new Promise(() => {})) },
  play: async ({ canvasElement }) => {
    const canvas = await askToRemove(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Sí, quitar' }));

    const button = await canvas.findByRole('button', { name: 'Quitando…' });
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await expect(button).toBeDisabled();
  },
};

function lastFormData(action: unknown): FormData {
  const calls = (action as { mock: { calls: unknown[][] } }).mock.calls;
  return calls.at(-1)?.[1] as FormData;
}
