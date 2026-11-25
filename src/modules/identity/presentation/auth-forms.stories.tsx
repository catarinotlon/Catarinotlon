import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useRef } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import type { FormAction } from '@/shared/ui/form-state';
import { fakeTurnstile, installFakeTurnstile, renderedWidget } from '@/test/fake-turnstile';

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

/** With Turnstile on, the challenge sits inside the form, and a refused check starts a new one. */
export const SignUpHumanCheckFailed: Story = {
  beforeEach: installFakeTurnstile,
  render: () => (
    <SignUpForm
      action={async () => ({ formError: 'errors.humanCheckFailed' })}
      googleAction={google}
      shirtSizes={['Size A']}
      open
      humanCheckSiteKey="story-site-key"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const submit = canvas.getByRole('button', { name: /Crear cuenta e inscribirme/ });
    await expect((await renderedWidget()).closest('form')).toContainElement(submit);

    await userEvent.click(submit);

    await expect(
      await canvas.findByText(/No pudimos confirmar que eres una persona/),
    ).toBeVisible();
    await waitFor(() => expect(fakeTurnstile.reset).toHaveBeenCalledWith('widget-1'));
  },
};

/** The server checked the token before the password, so a wrong password needs a new one. */
export const SignInHumanCheckAfterWrongPassword: Story = {
  beforeEach: installFakeTurnstile,
  render: () => (
    <SignInForm
      action={async () => ({ formError: 'errors.invalidCredentials' })}
      googleAction={google}
      humanCheckSiteKey="story-site-key"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const submit = canvas.getByRole('button', { name: 'Iniciar sesión' });
    await expect((await renderedWidget()).closest('form')).toContainElement(submit);

    await userEvent.click(submit);

    await expect(await canvas.findByRole('alert')).toBeVisible();
    await waitFor(() => expect(fakeTurnstile.reset).toHaveBeenCalledWith('widget-1'));
  },
};

/** A reset request that fails the human check says so, and starts a new challenge. */
export const ForgotPasswordHumanCheckFailed: Story = {
  beforeEach: installFakeTurnstile,
  render: () => (
    <ForgotPasswordForm
      action={async () => ({ formError: 'errors.humanCheckFailed' })}
      humanCheckSiteKey="story-site-key"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const submit = canvas.getByRole('button', { name: 'Enviar enlace' });
    await expect((await renderedWidget()).closest('form')).toContainElement(submit);

    await userEvent.type(canvas.getByLabelText('Correo electrónico'), 'a@example.test');
    await userEvent.click(submit);

    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      /No pudimos confirmar que eres una persona/,
    );
    await waitFor(() => expect(fakeTurnstile.reset).toHaveBeenCalledWith('widget-1'));
  },
};

/** Resending the link also carries the human check. */
export const ForgotPasswordResendHumanCheck: Story = {
  beforeEach: installFakeTurnstile,
  render: () => (
    <ForgotPasswordForm action={async () => ({ done: true })} humanCheckSiteKey="story-site-key" />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await renderedWidget();
    await userEvent.type(canvas.getByLabelText('Correo electrónico'), 'a@example.test');
    await userEvent.click(canvas.getByRole('button', { name: 'Enviar enlace' }));

    const resend = await canvas.findByRole('button', { name: 'Reenviar el enlace' });
    await waitFor(() => expect(fakeTurnstile.render).toHaveBeenCalledTimes(2));
    await expect(fakeTurnstile.render.mock.calls[1]![0].closest('form')).toContainElement(resend);
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

async function expectBusy(button: HTMLElement) {
  await expect(button).toHaveAttribute('aria-busy', 'true');
  await expect(button).toBeDisabled();
}

// Pending actions are released when each story ends: React keeps every
// unfinished action of the page in one transition, which would hold back the
// stories that run after it.
const held: Array<() => void> = [];
const hang: FormAction = () => new Promise((resolve) => held.push(() => resolve({})));
const hangGoogle = () => new Promise<void>((resolve) => held.push(resolve));
const releaseHeld = () => held.splice(0).forEach((release) => release());

/** Creating the account: the button says so and cannot be pressed twice. */
export const SignUpPending: Story = {
  render: () => <SignUpForm action={hang} googleAction={google} shirtSizes={['Size A']} open />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Crear cuenta e inscribirme/ }));
    await expectBusy(await canvas.findByRole('button', { name: 'Creando tu cuenta…' }));
    releaseHeld();
  },
};

/** Signing in shows that it is working. */
export const SignInPending: Story = {
  render: () => <SignInForm action={hang} googleAction={google} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Iniciar sesión' }));
    await expectBusy(await canvas.findByRole('button', { name: 'Entrando…' }));
    releaseHeld();
  },
};

/** Opening Google shows that it is working. */
export const GooglePending: Story = {
  render: () => <SignInForm action={noop} googleAction={hangGoogle} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Continuar con Google' }));
    await expectBusy(await canvas.findByRole('button', { name: 'Abriendo Google…' }));
    releaseHeld();
  },
};

/** Requesting a reset link shows that it is working. */
export const ForgotPending: Story = {
  render: () => <ForgotPasswordForm action={hang} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Correo electrónico'), 'a@example.test');
    await userEvent.click(canvas.getByRole('button', { name: 'Enviar enlace' }));
    await expectBusy(await canvas.findByRole('button', { name: 'Enviando enlace…' }));
    releaseHeld();
  },
};

/** Answers the first request, then never answers, to show the resend pending. */
function ForgotThenWait() {
  const calls = useRef(0);
  const action: FormAction = () => {
    calls.current += 1;
    return calls.current === 1 ? Promise.resolve({ done: true }) : new Promise(() => {});
  };
  return <ForgotPasswordForm action={action} />;
}

/** Resending the link shows that it is working. */
export const ForgotResendPending: Story = {
  render: () => <ForgotThenWait />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Correo electrónico'), 'a@example.test');
    await userEvent.click(canvas.getByRole('button', { name: 'Enviar enlace' }));
    await expect(await canvas.findByRole('heading', { name: 'Revisa tu correo' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Reenviar el enlace' }));
    await expectBusy(await canvas.findByRole('button', { name: 'Reenviando…' }));
  },
};

/** Saving the new password shows that it is working. */
export const ResetPending: Story = {
  render: () => <ResetPasswordForm action={hang} token="token-from-link" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Guardar contraseña' }));
    await expectBusy(await canvas.findByRole('button', { name: 'Guardando tu contraseña…' }));
    releaseHeld();
  },
};
