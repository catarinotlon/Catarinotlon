import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import type { EmailMessage } from '@/shared/domain/email';

import { buildEmailContent } from './email-content';
import { EmailBody } from './transactional-email';

const QR_PLACEHOLDER =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function Preview({ message }: { message: EmailMessage }) {
  return (
    <div className="bg-white">
      <EmailBody content={buildEmailContent(message)} qrSrc={QR_PLACEHOLDER} />
    </div>
  );
}

const meta = {
  title: 'Emails/TransactionalEmail',
  component: Preview,
  tags: ['autodocs'],
  parameters: { a11y: { test: 'error' } },
} satisfies Meta<typeof Preview>;

export default meta;
type Story = StoryObj<typeof meta>;

const envelope = { to: 'runner@example.test', locale: 'es', idempotencyKey: 'story' };
const url = 'https://example.test/action';

const showsAction =
  (label: string): NonNullable<Story['play']> =>
  async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('link', { name: label })).toBeVisible();
  };

/** Sent when an account is created with email and password. */
export const VerifyEmail: Story = {
  args: {
    message: { ...envelope, template: 'verify_email', data: { name: 'Sofía', url } },
  },
  play: showsAction('Confirmar mi correo'),
};

/** Sent when the runner requests a password reset. */
export const ResetPassword: Story = {
  args: {
    message: { ...envelope, template: 'reset_password', data: { name: 'Sofía', url } },
  },
  play: showsAction('Crear nueva contraseña'),
};

/** Sent when a registration is confirmed. */
export const RegistrationConfirmed: Story = {
  args: {
    message: {
      ...envelope,
      template: 'registration_confirmed',
      data: {
        runnerName: 'Sofía',
        distance: '5K',
        bibNumber: '48213',
        shirtName: 'SOFI',
        shirtSize: 'SIZE-A',
        accountUrl: url,
        ticketId: '00000000-0000-4000-8000-000000000000',
        ticketPdfUrl: url,
      },
    },
  },
  play: showsAction('Descargar boleto (PDF)'),
};

/** The scheduled reminder before kit pickup and race day. */
export const RaceReminder: Story = {
  args: {
    message: {
      ...envelope,
      template: 'race_reminder',
      data: { runnerName: 'Sofía', distance: '5K', bibNumber: '48213', accountUrl: url },
    },
  },
  play: showsAction('Ver mi boleto'),
};

/** Sent when the shirt name changes. */
export const ShirtNameUpdated: Story = {
  args: {
    message: {
      ...envelope,
      template: 'shirt_name_updated',
      data: { runnerName: 'Sofía', shirtName: 'SOFI', accountUrl: url },
    },
  },
  play: showsAction('Ver mi playera'),
};

/** Sent when the runner uploads a receipt. */
export const ReceiptReceived: Story = {
  args: {
    message: {
      ...envelope,
      template: 'receipt_received',
      data: {
        runners: [
          { name: 'Sofía', distance: '5K' },
          { name: 'Mateo', distance: '3K' },
        ],
        amountCents: 20000,
        accountUrl: url,
        uploadedAt: new Date('2026-01-15T18:00:00.000Z'),
      },
    },
  },
  play: showsAction('Ver el estado de mi pago'),
};

/** Sent when an admin rejects a receipt. */
export const ReceiptRejected: Story = {
  args: {
    message: {
      ...envelope,
      template: 'receipt_rejected',
      data: { reason: 'El monto no coincide', uploadUrl: url },
    },
  },
  play: showsAction('Subir un nuevo comprobante'),
};

/** Sent to admins when a receipt is uploaded. */
export const AdminNewReceipt: Story = {
  args: {
    message: {
      ...envelope,
      template: 'admin_new_receipt',
      data: {
        uploaderName: 'Sofía',
        runners: [
          { name: 'Sofía', distance: '5K' },
          { name: 'Mateo', distance: '3K' },
        ],
        amountCents: 20000,
        concept: 'CATARINOTLON - SOFIA',
        reviewUrl: url,
        uploadedAt: new Date('2026-01-15T18:00:00.000Z'),
      },
    },
  },
  play: showsAction('Revisar pago'),
};

/** Sent to every admin when the bank data changes. */
export const BankDataChanged: Story = {
  args: {
    message: {
      ...envelope,
      template: 'bank_data_changed',
      data: { changedBy: 'Admin', settingsUrl: url },
    },
  },
  play: showsAction('Ver el historial de cambios'),
};
