import type { Metadata } from 'next';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';

import { getEventSettings, getSignedInUser, listRunners } from '@/composition';
import { requireLocale } from '@/i18n/locale';
import { formatMoney } from '@/i18n/money';
import { redirect } from '@/i18n/navigation';
import { completeRegistrationAction } from '@/modules/registration/presentation/runner-actions';
import { RunnerForm } from '@/modules/registration/presentation/runner-form';
import { firstName } from '@/shared/domain/person-name';
import { Card, PageIntro, PageShell } from '@/shared/ui/page-shell';
import { SessionActions } from '@/modules/identity/presentation/session-actions';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'register' });
  return { title: t('metaTitle'), robots: { index: false } };
}

export default async function RegisterPage({ params }: Props) {
  const locale = requireLocale((await params).locale);
  setRequestLocale(locale);

  const user = await getSignedInUser();
  if (!user.ok) return redirect({ href: '/sign-in', locale });
  if ((await listRunners(user.value.id)).length > 0) {
    return redirect({ href: '/account', locale });
  }

  const [t, form, common, format, settings] = await Promise.all([
    getTranslations({ locale, namespace: 'register' }),
    getTranslations({ locale, namespace: 'registrationForm' }),
    getTranslations({ locale, namespace: 'common' }),
    getFormatter({ locale }),
    getEventSettings(),
  ]);
  const open = settings.feeCents !== null && settings.shirtSizes.length > 0;

  const intro = (
    <PageIntro
      eyebrow={t('eyebrow')}
      title={t('title')}
      body={t('body', { name: firstName(user.value.name) })}
    />
  );
  const deadline = settings.shirtSizeDeadline
    ? form('changesNoteDeadline', {
        date: format.dateTime(new Date(settings.shirtSizeDeadline), { dateStyle: 'long' }),
      })
    : undefined;

  return (
    <PageShell width={open ? 'wide' : 'narrow'} actions={<SessionActions />}>
      {open ? (
        <RunnerForm
          action={completeRegistrationAction}
          shirtSizes={settings.shirtSizes}
          submitLabel={t('submit')}
          anotherLabel={t('submitAnother')}
          defaultRunnerName={user.value.name}
          runnerHelp={form('runnerHelpFirst')}
          askPhone
          askConsent
          intro={intro}
          showSteps
          fee={formatMoney(settings.feeCents ?? 0, locale)}
          {...(deadline ? { changesNote: deadline } : {})}
        />
      ) : (
        <Card className="flex flex-col gap-5">
          {intro}
          <div role="status" className="rounded-xl bg-inverse px-4 py-3 text-inverse-foreground">
            <p className="m-0 font-bold">{common('openingSoonTitle')}</p>
            <p className="m-0 text-sm">{common('openingSoonBody')}</p>
          </div>
        </Card>
      )}
    </PageShell>
  );
}
