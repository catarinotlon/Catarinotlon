import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import type { FormAction } from '@/shared/ui/form-state';

import { ForgotPasswordForm, ResetPasswordForm, SignInForm, SignUpForm } from './auth-forms';

const meta = {
  title: 'Identity/AuthForms',
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const noop: FormAction = async () => ({});
const google = async () => undefined;

/** Sign-up with the race details while registration is open. */
export const SignUpOpen: Story = {
  render: () => <SignUpForm action={noop} googleAction={google} shirtSizes={['Size A']} open />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
    await expect(canvas.getByLabelText('Talla de playera')).toBeVisible();
    await userEvent.click(canvas.getByRole('radio', { name: '3K' }));
    await expect(
      canvas.getByRole('button', { name: 'Crear cuenta e inscribirme · 3K' }),
    ).toBeVisible();
  },
};

/** While registration is closed, only the account is created. */
export const SignUpClosed: Story = {
  render: () => <SignUpForm action={noop} googleAction={google} shirtSizes={[]} open={false} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Inscripciones próximamente')).toBeVisible();
    await expect(canvas.queryByLabelText('Talla de playera')).toBeNull();
    await expect(canvas.getByRole('button', { name: 'Crear mi cuenta' })).toBeVisible();
  },
};

/** Errors from the server appear next to each field. */
export const SignUpErrors: Story = {
  render: () => (
    <SignUpForm
      action={async () => ({
        fieldErrors: { email: 'errors.invalidEmail', acceptLegal: 'errors.acceptLegal' },
      })}
      googleAction={google}
      shirtSizes={['Size A']}
      open
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Crear cuenta e inscribirme/ }));
    await waitFor(() =>
      expect(canvas.getByLabelText('Correo electrónico')).toHaveAttribute('aria-invalid', 'true'),
    );
    await expect(
      canvas.getByText('Debes aceptar los términos y el aviso de privacidad.'),
    ).toBeVisible();
  },
};

const signInAction = fn<FormAction>(async () => ({ formError: 'errors.invalidCredentials' }));

/** A failed sign-in shows a form-level error. */
export const SignInError: Story = {
  render: () => <SignInForm action={signInAction} googleAction={google} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Correo electrónico'), 'a@example.test');
    await userEvent.type(canvas.getByLabelText('Contraseña'), 'password');
    await userEvent.click(canvas.getByRole('button', { name: 'Iniciar sesión' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'El correo o la contraseña no son correctos.',
    );
    await expect(canvas.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toBeVisible();
    await expect(canvas.getByLabelText('Correo electrónico')).toHaveValue('a@example.test');
    await expect(canvas.getByLabelText('Contraseña')).toHaveValue('password');
  },
};

/** After requesting a link, the same confirmation shows for any email. */
export const ForgotPasswordSent: Story = {
  render: () => <ForgotPasswordForm action={async () => ({ done: true })} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Correo electrónico'), 'a@example.test');
    await userEvent.click(canvas.getByRole('button', { name: 'Enviar enlace' }));
    await expect(await canvas.findByRole('heading', { name: 'Revisa tu correo' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Volver a iniciar sesión' })).toHaveClass(
      'rounded-full',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Reenviar el enlace' }));
    await expect(await canvas.findByRole('status')).toHaveTextContent('Te enviamos otro enlace.');
  },
};

/** The new password form carries the token from the link. */
export const ResetPassword: Story = {
  render: () => <ResetPasswordForm action={noop} token="token-from-link" />,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('form') as HTMLFormElement;
    await expect(new FormData(form).get('token')).toBe('token-from-link');
    await expect(within(canvasElement).getByLabelText('Nueva contraseña')).toHaveAttribute(
      'type',
      'password',
    );
  },
};

/** "Forgot your password" sits on the password label's line. */
export const SignInForgotBesideLabel: Story = {
  render: () => <SignInForm action={noop} googleAction={async () => undefined} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const label = canvas.getByText('Contraseña').getBoundingClientRect();
    const link = canvas.getByRole('link', { name: '¿Olvidaste tu contraseña?' });
    await expect(Math.abs(label.top - link.getBoundingClientRect().top)).toBeLessThan(14);
  },
};

/** The Google note on the reset request is a callout. */
export const ForgotGoogleNote: Story = {
  render: () => <ForgotPasswordForm action={noop} />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/Si creaste tu cuenta con Google/)).toHaveClass(
      'bg-muted',
    );
  },
};
