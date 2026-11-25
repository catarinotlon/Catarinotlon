import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import type { FormState } from '@/shared/ui/form-state';
import {
  fakeTurnstile,
  installFakeTurnstile,
  renderedWidget,
  solveHumanCheck,
} from '@/test/fake-turnstile';

import { VerifyEmailPanel } from './verify-email-panel';

const meta = {
  title: 'Identity/VerifyEmailPanel',
  component: VerifyEmailPanel,
  tags: ['autodocs'],
  args: {
    email: 'sofia@example.test',
    verified: false,
    resendAction: async (): Promise<FormState> => ({ done: true }),
  },
} satisfies Meta<typeof VerifyEmailPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Waiting for the runner to open the link. */
export const Waiting: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Confirma tu correo' })).toBeVisible();
    await expect(canvas.getByText(/sofia@example\.test/)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Reenviar el correo' }));
    await expect(await canvas.findByRole('status')).toHaveTextContent('Te enviamos otro enlace.');
  },
};

/** The address is unknown, for example after a new browser session. */
export const WithoutEmail: Story = {
  args: { email: null },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(/Te enviamos un enlace a tu correo/),
    ).toBeVisible();
  },
};

/** The link was opened. */
export const Verified: Story = {
  args: { verified: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: '¡Correo confirmado!' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Continuar al pago' })).toBeVisible();
  },
};

async function expectBusy(button: HTMLElement) {
  await expect(button).toHaveAttribute('aria-busy', 'true');
  await expect(button).toBeDisabled();
}

// The pending action is released when the story ends: React keeps every unfinished
// action of the page in one transition, which would hold back the stories after it.
const held: Array<() => void> = [];

/** Resending the email shows that it is working. */
export const ResendPending: Story = {
  args: { resendAction: () => new Promise((resolve) => held.push(() => resolve({}))) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Reenviar el correo' }));
    await expectBusy(await canvas.findByRole('button', { name: 'Reenviando…' }));
    held.splice(0).forEach((release) => release());
  },
};

/** Session recordings never show the address. */
export const EmailHiddenFromRecordings: Story = {
  play: async ({ canvasElement }) => {
    const text = within(canvasElement).getByText(/sofia@example\.test/);
    await expect(text.closest('[data-private]')).not.toBeNull();
  },
};

/** Resending carries the human check; a refused check says so and starts a new challenge. */
export const ResendHumanCheckFailed: Story = {
  args: {
    humanCheckSiteKey: 'story-site-key',
    resendAction: async () => ({ formError: 'errors.humanCheckFailed' }),
  },
  beforeEach: installFakeTurnstile,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const resend = canvas.getByRole('button', { name: 'Reenviar el correo' });
    await expect((await renderedWidget()).closest('form')).toContainElement(resend);
    solveHumanCheck();

    await userEvent.click(resend);

    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      /No pudimos confirmar que eres una persona/,
    );
    await waitFor(() => expect(fakeTurnstile.reset).toHaveBeenCalledWith('widget-1'));
  },
};
