import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import type { FormState } from '@/shared/ui/form-state';

import { AdminTeamPanel } from './admin-team-panel';

const done = async (): Promise<FormState> => ({ done: true });

const meta = {
  title: 'Identity/AdminTeamPanel',
  component: AdminTeamPanel,
  tags: ['autodocs'],
  args: {
    owners: ['catarinotlon@example.test'],
    admins: [
      {
        id: 'grant-1',
        email: 'ayudante@example.test',
        grantedAt: new Date('2026-11-24T18:00:00.000Z'),
      },
    ],
    grantAction: fn(done),
    revokeAction: fn(done),
  },
} satisfies Meta<typeof AdminTeamPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The owner is listed apart and cannot be removed; added admins can. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 1, name: 'Administradores' })).toBeVisible();
    const owner = canvas.getByRole('listitem', { name: 'catarinotlon@example.test' });
    await expect(within(owner).getByText('Dueño')).toBeVisible();
    await expect(within(owner).queryByRole('button')).toBeNull();
    const added = canvas.getByRole('listitem', { name: 'ayudante@example.test' });
    await expect(
      within(added).getByRole('button', { name: 'Quitar a ayudante@example.test' }),
    ).toBeVisible();
  },
};

/** Without added admins, the list says so. */
export const NoAddedAdmins: Story = {
  args: { admins: [] },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText('Aún no has agregado administradores.'),
    ).toBeVisible();
  },
};

/** Adding an admin sends the address. */
export const Add: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByLabelText('Correo del nuevo administrador'),
      'nuevo@example.test',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Agregar administrador' }));
    await waitFor(() => expect(args.grantAction).toHaveBeenCalled());
    const data = (args.grantAction as ReturnType<typeof fn>).mock.calls[0]?.[1] as FormData;
    await expect(data.get('email')).toBe('nuevo@example.test');
  },
};

/** A refused address is explained on the field. */
export const AddError: Story = {
  args: {
    grantAction: fn(async (): Promise<FormState> => ({
      fieldErrors: { email: 'admin.team.errors.already_admin' },
    })),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByLabelText('Correo del nuevo administrador'),
      'catarinotlon@example.test',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Agregar administrador' }));
    await expect(await canvas.findByText('Ese correo ya es de un administrador.')).toBeVisible();
  },
};

/** Removing an admin sends which one. */
export const Remove: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Quitar a ayudante@example.test' }));
    await waitFor(() => expect(args.revokeAction).toHaveBeenCalled());
    const data = (args.revokeAction as ReturnType<typeof fn>).mock.calls[0]?.[1] as FormData;
    await expect(data.get('grantId')).toBe('grant-1');
  },
};

/** The addresses are personal data, hidden from recordings. */
export const HiddenFromRecordings: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('ul[data-private]')).not.toBeNull();
  },
};
