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

/** The terms show the event facts the organizer set, and update when they change. */
export const TermsWithSettings: Story = {
  args: {
    document: 'terms',
    facts: {
      eventDate: '2030-01-15',
      venue: 'Deportivo de ejemplo',
      feeCents: 25000,
      sizeDeadline: '2030-01-01T18:00:00.000Z',
      kitPickup: 'el sábado en la sede',
      contactEmail: 'contact@example.test',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/Se realizará el 15 de enero de 2030 en Deportivo de ejemplo\./),
    ).toBeVisible();
    await expect(canvas.getByText(/la misma para 3K y para 5K: \$250\.00\./)).toBeVisible();
    await expect(canvas.getByText(/solo hasta el 1 de enero de 2030\./)).toBeVisible();
    await expect(canvas.getByText(/El kit se entrega en el sábado en la sede/)).toBeVisible();
    await expect(canvas.getByText(/escribe a contact@example\.test\./)).toBeVisible();
    await expect(canvas.queryByText(/\[FECHA DEL EVENTO\]|\[PRECIO\]|\[SEDE\]/)).toBeNull();
  },
};

/** Until the organizer sets a fact, its gap stays visible as a bracket. */
export const TermsBeforeSettings: Story = {
  args: {
    document: 'terms',
    facts: {
      eventDate: null,
      venue: null,
      feeCents: null,
      sizeDeadline: null,
      kitPickup: null,
      contactEmail: null,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/Se realizará el \[FECHA DEL EVENTO\] en \[SEDE\]\./),
    ).toBeVisible();
    await expect(canvas.getByText(/: \[PRECIO\]\./)).toBeVisible();
    await expect(canvas.getByText(/escribe a \[CORREO DE CONTACTO\]\./)).toBeVisible();
  },
};
