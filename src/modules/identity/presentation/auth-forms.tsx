'use client';

import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';

import { Link } from '@/i18n/navigation';
import { RunnerFields } from '@/modules/registration';
import { Button, buttonClasses } from '@/shared/ui/button';
import { SubmitButton } from '@/shared/ui/submit-button';
import { FormAlert, TextField } from '@/shared/ui/form-fields';
import type { FormAction, FormState } from '@/shared/ui/form-state';
import { Card, DottedStage, SplitLayout } from '@/shared/ui/page-shell';
import { ShirtPreview } from '@/shared/ui/shirt-preview';
import { IconBadge } from '@/shared/ui/status-pill';
import { useStickyForm } from '@/shared/ui/use-sticky-form';

function useFormMessages(state: FormState) {
  const root = useTranslations();
  return {
    field: (name: string) => {
      const key = state.fieldErrors?.[name];
      return key ? root(key as never) : undefined;
    },
    form: state.formError ? root(state.formError as never) : undefined,
  };
}

function Divider({ children }: { children: string }) {
  return (
    <p className="m-0 flex items-center gap-3 text-sm text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
      {children}
    </p>
  );
}

function GoogleButton({ action }: { action: () => Promise<void> }) {
  const t = useTranslations('auth');
  const busy = useTranslations('busy');
  return (
    <form action={action}>
      <SubmitButton variant="outline" fullWidth pendingLabel={busy('openingGoogle')}>
        <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5">
          <path
            fill="#EA4335"
            d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 2.9-2.2 5.4-4.6 7l7.2 5.6c4.2-3.9 7.2-9.6 7.2-17.1z"
          />
          <path
            fill="#FBBC05"
            d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C1 16.5 0 20.1 0 24s1 7.5 2.6 10.8l7.9-6.1z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.2-5.6c-2.2 1.5-5 2.4-8.7 2.4-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"
          />
        </svg>
        {t('google')}
      </SubmitButton>
    </form>
  );
}

/** Props of {@link SignUpForm}. */
export interface SignUpFormProps {
  /** The sign-up server action. */
  action: FormAction;
  /** Starts the Google sign-in flow. */
  googleAction: () => Promise<void>;
  /** The shirt sizes on offer. */
  shirtSizes: readonly string[];
  /** Whether registration is open. When closed, only the account is created. */
  open: boolean;
  /** The page's introduction, shown beside the form with the live shirt. */
  intro?: ReactNode;
}

/**
 * Creates an account and, while registration is open, registers the runner.
 *
 * @param props - The actions, the sizes, and whether registration is open.
 * @returns The form.
 */
export function SignUpForm({ action, googleAction, shirtSizes, open, intro }: SignUpFormProps) {
  const t = useTranslations('auth');
  const common = useTranslations('common');
  const legal = useTranslations('registrationForm');
  const { state, formAction, onSubmit, pending } = useStickyForm(action);
  const [distance, setDistance] = useState<'3K' | '5K'>('5K');
  const [shirtName, setShirtName] = useState('');
  const shirt = useTranslations('shirt');
  const busy = useTranslations('busy');
  const messages = useFormMessages(state);

  const form = (
    <div className="flex flex-col gap-5">
      <GoogleButton action={googleAction} />
      <Divider>{t('signUp.divider')}</Divider>
      {!open && (
        <div role="status" className="rounded-xl bg-inverse px-4 py-3 text-inverse-foreground">
          <p className="m-0 font-bold">{common('openingSoonTitle')}</p>
          <p className="m-0 text-sm">{t('signUp.closedNote')}</p>
        </div>
      )}
      <form action={formAction} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {messages.form && <FormAlert>{messages.form}</FormAlert>}
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <TextField
            label={t('fullName')}
            name="name"
            autoComplete="name"
            error={messages.field('name')}
          />
          <TextField
            label={t('email')}
            name="email"
            type="email"
            autoComplete="email"
            error={messages.field('email')}
          />
          <TextField
            label={t('password')}
            name="password"
            type="password"
            autoComplete="new-password"
            help={t('passwordHelp')}
            error={messages.field('password')}
          />
          <TextField
            label={t('phone')}
            name="phone"
            type="tel"
            autoComplete="tel"
            error={messages.field('phone')}
          />
        </div>
        {open && (
          <RunnerFields
            shirtSizes={shirtSizes}
            errors={state.fieldErrors ?? {}}
            onDistanceChange={setDistance}
            onShirtNameChange={setShirtName}
            showPreview={!intro}
          />
        )}
        <div className="flex flex-col gap-1">
          <label className="flex min-h-11 items-start gap-3">
            <input
              type="checkbox"
              name="acceptLegal"
              className="mt-1 size-5 shrink-0 accent-primary"
              aria-invalid={messages.field('acceptLegal') ? true : undefined}
            />
            <span>
              {legal('acceptPrefix')}{' '}
              <Link
                href="/terms"
                target="_blank"
                className="font-semibold underline underline-offset-2"
              >
                {legal('terms')}
              </Link>{' '}
              {legal('and')}{' '}
              <Link
                href="/privacy"
                target="_blank"
                className="font-semibold underline underline-offset-2"
              >
                {legal('privacy')}
              </Link>
              .
            </span>
          </label>
          {messages.field('acceptLegal') && (
            <p className="m-0 text-sm font-semibold text-primary-text">
              {messages.field('acceptLegal')}
            </p>
          )}
        </div>
        <Button
          type="submit"
          variant="cta"
          fullWidth
          pending={pending}
          pendingLabel={busy('creatingAccount')}
        >
          {open ? t('signUp.submit', { distance }) : t('signUp.submitClosed')}
        </Button>
      </form>
      <p className="m-0 text-center">
        {t('signUp.haveAccount')}{' '}
        <Link href="/sign-in" className="font-semibold underline underline-offset-2">
          {t('signUp.signIn')}
        </Link>
      </p>
    </div>
  );

  if (!intro) return form;

  return (
    <SplitLayout
      aside={
        <>
          {intro}
          <DottedStage className="relative flex justify-center">
            <div className="w-full max-w-64">
              <ShirtPreview name={shirtName} />
            </div>
            <span className="absolute bottom-3 rounded-full bg-ink px-4 py-1 text-sm font-bold text-primary-foreground">
              {shirt('previewBadge')}
            </span>
          </DottedStage>
        </>
      }
    >
      <Card>{form}</Card>
    </SplitLayout>
  );
}

/** Props of {@link SignInForm}. */
export interface SignInFormProps {
  /** The sign-in server action. */
  action: FormAction;
  /** Starts the Google sign-in flow. */
  googleAction: () => Promise<void>;
}

/**
 * Signs in with Google or with email and password.
 *
 * @param props - The actions.
 * @returns The form.
 */
export function SignInForm({ action, googleAction }: SignInFormProps) {
  const t = useTranslations('auth');
  const busy = useTranslations('busy');
  const { state, formAction, onSubmit, pending } = useStickyForm(action);
  const messages = useFormMessages(state);

  return (
    <div className="flex flex-col gap-5">
      <GoogleButton action={googleAction} />
      <Divider>{t('signIn.divider')}</Divider>
      <form action={formAction} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {messages.form && <FormAlert>{messages.form}</FormAlert>}
        <TextField
          label={t('email')}
          name="email"
          type="email"
          autoComplete="email"
          error={messages.field('email')}
        />
        <TextField
          label={t('password')}
          name="password"
          type="password"
          autoComplete="current-password"
          error={messages.field('password')}
          labelAction={
            <Link
              href="/forgot-password"
              className="text-sm font-semibold underline underline-offset-2"
            >
              {t('signIn.forgot')}
            </Link>
          }
        />
        <Button
          type="submit"
          variant="cta"
          fullWidth
          pending={pending}
          pendingLabel={busy('signingIn')}
        >
          {t('signIn.submit')}
        </Button>
      </form>
      <p className="m-0 text-center">
        {t('signIn.noAccount')}{' '}
        <Link href="/sign-up" className="font-semibold underline underline-offset-2">
          {t('signIn.signUp')}
        </Link>
      </p>
    </div>
  );
}

/**
 * Requests a password reset link.
 *
 * @remarks
 * The confirmation is the same whether or not the email has an account.
 *
 * @param props - The server action.
 * @returns The form, or the confirmation once sent.
 */
export function ForgotPasswordForm({ action }: { action: FormAction }) {
  const t = useTranslations('auth.forgot');
  const auth = useTranslations('auth');
  const busy = useTranslations('busy');
  const [sent, setSent] = useState({ email: '', times: 0 });
  const { state, formAction, onSubmit, pending } = useStickyForm(async (previous, data) => {
    const email = String(data.get('email') ?? '');
    const result = await action(previous, data);
    if (result.done) setSent((current) => ({ email, times: current.times + 1 }));
    return result;
  });
  const messages = useFormMessages(state);

  if (state.done) {
    return (
      <div className="flex flex-col gap-4">
        <IconBadge icon="mail" />
        <h1 className="m-0 font-heading text-[clamp(36px,9vw,44px)]">{t('sentTitle')}</h1>
        <p className="m-0 text-muted-foreground">{t('sentBody')}</p>
        <Link href="/sign-in" className={buttonClasses({ variant: 'cta', fullWidth: true })}>
          {t('back')}
        </Link>
        <form action={formAction} onSubmit={onSubmit} className="self-center">
          <input type="hidden" name="email" value={sent.email} />
          <Button
            type="submit"
            variant="link"
            className="underline"
            pending={pending}
            pendingLabel={busy('resending')}
          >
            {t('resend')}
          </Button>
        </form>
        {sent.times > 1 && (
          <p role="status" className="m-0 text-center font-semibold">
            {t('resent')}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <IconBadge icon="key" />
      <h1 className="m-0 font-heading text-[clamp(36px,9vw,44px)]">{t('title')}</h1>
      <p className="m-0 text-muted-foreground">{t('body')}</p>
      <form action={formAction} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <TextField
          label={auth('email')}
          name="email"
          type="email"
          autoComplete="email"
          error={messages.field('email')}
        />
        <Button
          type="submit"
          variant="cta"
          fullWidth
          pending={pending}
          pendingLabel={busy('sendingLink')}
        >
          {t('submit')}
        </Button>
      </form>
      <p className="m-0 rounded-lg bg-muted p-3 text-sm text-foreground">{t('googleNote')}</p>
      <Link
        href="/sign-in"
        className="inline-flex min-h-11 items-center self-center font-semibold underline underline-offset-2"
      >
        {t('back')}
      </Link>
    </div>
  );
}

/** Props of {@link ResetPasswordForm}. */
export interface ResetPasswordFormProps {
  /** The reset server action. */
  action: FormAction;
  /** The token from the emailed link. */
  token: string;
}

/**
 * Sets a new password from a reset link.
 *
 * @param props - The server action and the token.
 * @returns The form.
 */
export function ResetPasswordForm({ action, token }: ResetPasswordFormProps) {
  const t = useTranslations('auth.reset');
  const auth = useTranslations('auth');
  const busy = useTranslations('busy');
  const { state, formAction, onSubmit, pending } = useStickyForm(action);
  const messages = useFormMessages(state);

  return (
    <div className="flex flex-col gap-4">
      <IconBadge icon="lock" />
      <h1 className="m-0 font-heading text-[clamp(36px,9vw,44px)]">{t('title')}</h1>
      <form action={formAction} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {messages.form && <FormAlert>{messages.form}</FormAlert>}
        <input type="hidden" name="token" value={token} />
        <TextField
          label={t('password')}
          name="password"
          type="password"
          autoComplete="new-password"
          help={auth('passwordHelp')}
          error={messages.field('password')}
        />
        <TextField
          label={t('confirm')}
          name="confirm"
          type="password"
          autoComplete="new-password"
          error={messages.field('confirm')}
        />
        <Button
          type="submit"
          variant="cta"
          fullWidth
          pending={pending}
          pendingLabel={busy('savingPassword')}
        >
          {t('submit')}
        </Button>
      </form>
    </div>
  );
}
