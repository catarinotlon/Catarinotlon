import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, within } from 'storybook/test';

import { PaymentView, type PaymentViewProps } from './payment-view';

const props: PaymentViewProps = {
  userId: 'user-1',
  uploadMode: 'local',
  recordReceipt: fn(async () => ({ done: true })),
  bank: { beneficiary: 'Sample Beneficiary', bank: 'Sample Bank', clabe: '002010077777777771' },
  contact: {
    fullName: 'Sample Contact',
    phone: '0000000000',
    email: 'contact@example.test',
    whatsapp: '520000000000',
    hours: 'Sample hours',
  },
  concept: 'CATARINOTLON - SAMPLE',
  totalCents: 20000,
  runners: [
    {
      id: 'a',
      runnerName: 'Runner One',
      distance: '5K',
      shirtName: 'ONE',
      shirtSize: 'Size A',
      feeCents: 10000,
    },
    {
      id: 'b',
      runnerName: 'Runner Two',
      distance: '3K',
      shirtName: 'TWO',
      shirtSize: 'Size B',
      feeCents: 10000,
    },
  ],
};

const meta = {
  title: 'Payments/PaymentView',
  component: PaymentView,
  tags: ['autodocs'],
  args: props,
} satisfies Meta<typeof PaymentView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Bank data, runners to pay, and the receipt upload. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('002010077777777771')).toBeVisible();
    await expect(canvas.getByText('CATARINOTLON - SAMPLE')).toBeVisible();
    await expect(canvas.getByTestId('payment-total')).toHaveTextContent('$200.00');
    await expect(canvas.getByText('Total a transferir (2 corredores)')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Copiar beneficiario' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Copiar CLABE' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Copiar concepto' })).toBeVisible();
    const steps = within(canvas.getByRole('list', { name: 'Pasos de tu inscripción' }));
    await expect(steps.getByText('Pago').closest('li')).toHaveAttribute('aria-current', 'step');
    await expect(
      canvas.getByRole('link', { name: 'Agregar otro corredor antes de pagar' }),
    ).toHaveClass('border-dashed');
  },
};

/** The WhatsApp button opens a chat with the contact. */
export const ContactCard: Story = {
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole('link', { name: 'Chatear por WhatsApp' });
    await expect(link).toHaveAttribute('href', 'https://wa.me/520000000000');
  },
};

/** On narrow screens the runners to pay come before the bank data. */
export const RunnersFirstOnMobile: Story = {
  globals: { viewport: { value: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const summary = within(canvasElement).getByRole('heading', { name: 'Lo que vas a pagar' });
    const transfer = within(canvasElement).getByRole('heading', {
      name: '1. Transfiere a esta cuenta',
    });
    await expect(summary.closest('[data-order]')).toHaveAttribute('data-order', 'first-on-mobile');
    await expect(transfer).toBeVisible();
  },
};
