import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { LegalDocument } from './legal-document';

const meta = {
  title: 'Event/LegalDocument',
  component: LegalDocument,
  tags: ['autodocs'],
  args: { document: 'privacy' },
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: '/es' } } },
} satisfies Meta<typeof LegalDocument>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The privacy notice, always marked as a draft. */
export const Privacy: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Aviso de privacidad' }),
    ).toBeVisible();
    await expect(canvas.getByText('Borrador · pendiente de revisión legal')).toBeVisible();
    await expect(
      canvas.getByRole('heading', { name: '1. Quién es responsable de tus datos' }),
    ).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Términos y condiciones' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Aviso de privacidad' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  },
};

/** The terms, which state there are no refunds. */
export const Terms: Story = {
  args: { document: 'terms' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Términos y condiciones' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('heading', { name: '6. Cancelaciones y reembolsos' }),
    ).toBeVisible();
    await expect(canvas.getByText(/No hay cancelaciones ni reembolsos/)).toBeVisible();
  },
};
