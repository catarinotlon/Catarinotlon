'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';

import type { EventSettingsValues, SettingKey } from '@/modules/event';
import { Button } from '@/shared/ui/button';
import { FormAlert, TextAreaField, TextField } from '@/shared/ui/form-fields';
import type { FormAction } from '@/shared/ui/form-state';
import { Card } from '@/shared/ui/page-shell';
import { useStickyForm } from '@/shared/ui/use-sticky-form';

/** One entry of the settings history. */
export interface SettingsHistoryEntry {
  /** The version's UUID. */
  id: string;
  /** What changed. */
  changedFields: readonly SettingKey[];
  /** The name of the admin who changed it. */
  changedBy: string;
  /** When it changed. */
  createdAt: Date;
}

/** Props of {@link EventSettingsForm}. */
export interface EventSettingsFormProps {
  /** The current settings. */
  values: EventSettingsValues;
  /** The settings still missing. */
  missing: readonly SettingKey[];
  /** Saves one section. */
  action: FormAction;
  /** Past versions, newest first. */
  history: readonly SettingsHistoryEntry[];
}

function Section({
  section,
  title,
  help,
  submitLabel,
  action,
  badge,
  editing,
  emphasized = false,
  children,
}: {
  section: string;
  title: string;
  help?: string;
  submitLabel: string;
  action: FormAction;
  badge?: string;
  /** Set on a section that opens on demand. */
  editing?: boolean;
  /** Marks a protected section with a heavier border. */
  emphasized?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations('admin.settings');
  const root = useTranslations();
  const { state, formAction, onSubmit, pending } = useStickyForm(action);

  return (
    <Card {...(emphasized ? { className: 'border-2 border-input-border' } : {})}>
      <form action={formAction} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="section" value={section} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 font-heading text-2xl">{title}</h2>
          {badge && (
            <span className="rounded-full bg-inverse px-3 py-0.5 text-sm font-semibold text-inverse-foreground">
              {badge}
            </span>
          )}
        </div>
        {help && <p className="m-0 text-sm text-muted-foreground">{help}</p>}
        {state.formError && <FormAlert>{root(state.formError as never)}</FormAlert>}
        <div className="grid gap-4 md:grid-cols-2">{children}</div>
        {state.done && editing !== true && (
          <p role="status" className="m-0 font-semibold">
            {t('saved')}
          </p>
        )}
        {editing !== false && (
          <Button type="submit" variant="inverse" disabled={pending} className="self-start">
            {submitLabel}
          </Button>
        )}
      </form>
    </Card>
  );
}

function BankSection({ values, action }: Pick<EventSettingsFormProps, 'values' | 'action'>) {
  const t = useTranslations('admin.settings');
  const [editing, setEditing] = useState(false);
  const notSet = t('notSet');

  return (
    <Section
      section="bank"
      title={t('bankHeading')}
      badge={t('protected')}
      help={t('bankHelp')}
      submitLabel={t('saveBank')}
      editing={editing}
      emphasized
      action={async (previous, data) => {
        const result = await action(previous, data);
        if (result.done) setEditing(false);
        return result;
      }}
    >
      <dl className="m-0 flex flex-col md:col-span-2">
        {(
          [
            [t('beneficiary'), values.bank?.beneficiary],
            [t('bank'), values.bank?.bank],
            [t('clabe'), values.bank?.clabe],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="flex flex-wrap justify-between gap-x-4 border-t border-border py-2 first:border-t-0"
          >
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="m-0 font-bold break-all">{value ?? notSet}</dd>
          </div>
        ))}
      </dl>
      {editing ? (
        <>
          <TextField
            label={`${t('beneficiary')} `}
            name="beneficiary"
            defaultValue={values.bank?.beneficiary ?? ''}
          />
          <TextField label={`${t('bank')} `} name="bank" defaultValue={values.bank?.bank ?? ''} />
          <TextField
            label={`${t('clabe')} `}
            name="clabe"
            inputMode="numeric"
            help={t('clabeHelp')}
            defaultValue={values.bank?.clabe ?? ''}
          />
          <TextField
            label={t('password')}
            name="password"
            type="password"
            autoComplete="current-password"
          />
          <Button
            type="button"
            variant="outline"
            className="self-end justify-self-start"
            onClick={() => setEditing(false)}
          >
            {t('cancel')}
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="inverse"
          className="justify-self-start md:col-span-2"
          onClick={() => setEditing(true)}
        >
          {values.bank ? t('changeBank') : t('captureBank')}
        </Button>
      )}
    </Section>
  );
}

/**
 * The organizer's event settings, one independently saved section at a time.
 *
 * @remarks
 * Changing the bank data requires the admin's password and alerts every admin.
 *
 * @param props - The values, what is missing, the action, and the history.
 * @returns The form.
 */
export function EventSettingsForm({ values, missing, action, history }: EventSettingsFormProps) {
  const t = useTranslations('admin.settings');
  const format = useFormatter();
  const keyLabel = (key: SettingKey) => t(`keys.${key}`);
  const paymentClosed = values.feeCents === null || values.bank === null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-heading text-5xl">{t('title')}</h1>
        <p className="m-0 max-w-2xl text-muted-foreground">{t('body')}</p>
      </div>

      {paymentClosed && (
        <div role="status" className="rounded-2xl border-2 border-gold bg-surface p-4">
          <p className="m-0 font-display text-xl font-bold uppercase">{t('closedTitle')}</p>
          <p className="m-0 text-sm">{t('closedBody')}</p>
        </div>
      )}
      {missing.length > 0 && (
        <p className="m-0 font-semibold">
          {t('missing', { items: missing.map(keyLabel).join(', ') })}
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          <Section
            section="event"
            title={t('eventHeading')}
            submitLabel={t('saveEvent')}
            action={action}
          >
            <TextField
              label={t('eventDate')}
              name="eventDate"
              type="date"
              defaultValue={values.eventDate ?? ''}
            />
            <TextField
              label={t('routeMap')}
              name="routeMapUrl"
              type="url"
              defaultValue={values.routeMapUrl ?? ''}
            />
            <TextField
              label={t('start3k')}
              name="start3k"
              type="time"
              defaultValue={values.startTimes['3K'] ?? ''}
            />
            <TextField
              label={t('start5k')}
              name="start5k"
              type="time"
              defaultValue={values.startTimes['5K'] ?? ''}
            />
            <TextField label={t('venueEs')} name="venueEs" defaultValue={values.venue?.es ?? ''} />
            <TextField label={t('venueEn')} name="venueEn" defaultValue={values.venue?.en ?? ''} />
            <TextAreaField
              label={t('kitEs')}
              name="kitEs"
              help={t('kitHelp')}
              defaultValue={values.kitPickup?.es ?? ''}
            />
            <TextAreaField
              label={t('kitEn')}
              name="kitEn"
              defaultValue={values.kitPickup?.en ?? ''}
            />
          </Section>

          <Section
            section="contact"
            title={t('contactHeading')}
            help={t('contactHelp')}
            submitLabel={t('saveContact')}
            action={action}
          >
            <TextField
              label={t('fullName')}
              name="fullName"
              defaultValue={values.contact?.fullName ?? ''}
            />
            <TextField
              label={t('email')}
              name="email"
              type="email"
              defaultValue={values.contact?.email ?? ''}
            />
            <TextField
              label={t('phone')}
              name="phone"
              type="tel"
              defaultValue={values.contact?.phone ?? ''}
            />
            <TextField
              label={t('whatsapp')}
              name="whatsapp"
              type="tel"
              defaultValue={values.contact?.whatsapp ?? ''}
            />
            <TextField
              label={t('hoursEs')}
              name="hoursEs"
              defaultValue={values.contact?.hours.es ?? ''}
            />
            <TextField
              label={t('hoursEn')}
              name="hoursEn"
              defaultValue={values.contact?.hours.en ?? ''}
            />
          </Section>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <Section
            section="registration"
            title={t('registrationHeading')}
            help={t('feeHelp')}
            submitLabel={t('saveRegistration')}
            action={action}
          >
            <TextField
              label={t('fee')}
              name="fee"
              inputMode="decimal"
              defaultValue={values.feeCents === null ? '' : String(values.feeCents / 100)}
            />
            <TextField
              label={t('deadline')}
              name="shirtSizeDeadline"
              type="date"
              defaultValue={values.shirtSizeDeadline?.slice(0, 10) ?? ''}
            />
            <TextField
              label={t('sizes')}
              name="shirtSizes"
              help={t('sizesHelp')}
              defaultValue={values.shirtSizes.join(', ')}
              className="md:col-span-2"
            />
          </Section>

          <BankSection values={values} action={action} />

          <Card className="flex flex-col gap-3">
            <h2 className="m-0 font-heading text-2xl">{t('historyHeading')}</h2>
            <p className="m-0 text-sm text-muted-foreground">{t('historyHelp')}</p>
            {history.length === 0 ? (
              <p className="m-0 rounded-xl border-2 border-dashed border-input-border p-4 text-center">
                {t('noHistory')}
              </p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {history.map((entry) => (
                  <li key={entry.id} className="border-b border-border pb-2 last:border-b-0">
                    {t('historyLine', {
                      date: format.dateTime(entry.createdAt, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }),
                      who: entry.changedBy,
                      fields: entry.changedFields.map(keyLabel).join(', '),
                    })}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
