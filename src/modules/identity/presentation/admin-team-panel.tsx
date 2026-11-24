'use client';

import { useFormatter, useTranslations } from 'next-intl';

import { Button } from '@/shared/ui/button';
import { FormAlert, TextField } from '@/shared/ui/form-fields';
import type { FormAction } from '@/shared/ui/form-state';
import { Card } from '@/shared/ui/page-shell';
import { useStickyForm } from '@/shared/ui/use-sticky-form';

/** An admin the owner added, as the panel shows it. */
export interface AdminTeamMember {
  /** The grant's UUID. */
  readonly id: string;
  /** The admin's address. */
  readonly email: string;
  /** When access was given. */
  readonly grantedAt: Date;
}

/** Props of {@link AdminTeamPanel}. */
export interface AdminTeamPanelProps {
  /** The owners' addresses, which cannot be removed from the app. */
  owners: readonly string[];
  /** The added admins, oldest first. */
  admins: readonly AdminTeamMember[];
  /** Adds an admin from the submitted `email`. */
  grantAction: FormAction;
  /** Removes the admin in the submitted `grantId`. */
  revokeAction: FormAction;
}

function RemoveAdminButton({ admin, action }: { admin: AdminTeamMember; action: FormAction }) {
  const t = useTranslations('admin.team');
  const root = useTranslations();
  const busy = useTranslations('busy');
  const { state, formAction, onSubmit, pending } = useStickyForm(action);

  return (
    <form action={formAction} onSubmit={onSubmit} className="flex flex-col items-end gap-2">
      <input type="hidden" name="grantId" value={admin.id} />
      <Button
        type="submit"
        variant="outline"
        aria-label={t('removeLabel', { email: admin.email })}
        pending={pending}
        pendingLabel={busy('removing')}
      >
        {t('remove')}
      </Button>
      {state.formError && <FormAlert>{root(state.formError as never)}</FormAlert>}
    </form>
  );
}

function AddAdminForm({ action }: { action: FormAction }) {
  const t = useTranslations('admin.team');
  const root = useTranslations();
  const busy = useTranslations('busy');
  const { state, formAction, onSubmit, pending } = useStickyForm(action);
  const errorKey = state.fieldErrors?.email;

  return (
    <form action={formAction} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <h2 className="m-0 font-heading text-2xl">{t('addHeading')}</h2>
      <TextField
        label={t('emailLabel')}
        name="email"
        type="email"
        autoComplete="off"
        help={t('emailHelp')}
        error={errorKey ? root(errorKey as never) : undefined}
      />
      {state.formError && <FormAlert>{root(state.formError as never)}</FormAlert>}
      <Button
        type="submit"
        variant="inverse"
        className="self-start"
        pending={pending}
        pendingLabel={busy('adding')}
      >
        {t('add')}
      </Button>
    </form>
  );
}

/**
 * The owner's screen to see, add, and remove admins.
 *
 * @remarks
 * Only owners reach it. Owners come from the server configuration and are
 * listed without a remove button. The addresses are hidden from recordings.
 *
 * @param props - The owners, the added admins, and the actions.
 * @returns The panel.
 */
export function AdminTeamPanel({ owners, admins, grantAction, revokeAction }: AdminTeamPanelProps) {
  const t = useTranslations('admin.team');
  const format = useFormatter();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-heading text-5xl">{t('title')}</h1>
        <p className="m-0 max-w-2xl text-muted-foreground">{t('body')}</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <Card className="flex flex-col gap-3">
          <ul aria-label={t('listLabel')} data-private className="m-0 flex list-none flex-col p-0">
            {owners.map((email) => (
              <li
                key={email}
                aria-label={email}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-3"
              >
                <span className="font-semibold break-all">{email}</span>
                <span className="rounded-full bg-inverse px-3 py-0.5 text-sm font-semibold text-inverse-foreground">
                  {t('owner')}
                </span>
              </li>
            ))}
            {admins.map((admin) => (
              <li
                key={admin.id}
                aria-label={admin.email}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-3 last:border-b-0"
              >
                <span className="flex flex-col">
                  <span className="font-semibold break-all">{admin.email}</span>
                  <span className="text-sm text-muted-foreground">
                    {t('addedOn', {
                      date: format.dateTime(admin.grantedAt, { dateStyle: 'medium' }),
                    })}
                  </span>
                </span>
                <RemoveAdminButton admin={admin} action={revokeAction} />
              </li>
            ))}
          </ul>
          {admins.length === 0 && (
            <p className="m-0 rounded-xl border-2 border-dashed border-input-border p-4 text-center">
              {t('empty')}
            </p>
          )}
        </Card>

        <Card>
          <AddAdminForm key={admins.length} action={grantAction} />
        </Card>
      </div>
    </div>
  );
}
