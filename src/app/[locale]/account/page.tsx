import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import {
  accountDirectory,
  accounts,
  appClock,
  formatRunnerFacts,
  getAccountOverview,
  getEventSettings,
  getSignedInUser,
  receiptUploadMode,
  ticketQrDataUrl,
} from '@/composition';
import { requireLocale } from '@/i18n/locale';
import { formatMoney } from '@/i18n/money';
import { redirect } from '@/i18n/navigation';
import { isPaymentOpen } from '@/modules/event';
import { saveAccountAction, signOutAction } from '@/modules/identity/presentation/auth-actions';
import { SessionActions } from '@/app/[locale]/_chrome/session-actions';
import {
  recordReceiptAction,
  replaceReceiptAction,
} from '@/modules/payments/presentation/payment-actions';
import { AccountView, type AccountRunner } from '@/modules/payments/presentation/account-view';
import { whatsappUrl } from '@/modules/payments/presentation/whatsapp-url';
import {
  removeRunnerAction,
  saveDistanceAction,
  saveShirtNameAction,
  saveShirtSizeAction,
} from '@/modules/registration/presentation/runner-actions';
import { PageShell } from '@/shared/ui/page-shell';

import { SiteNavigation } from '../_chrome/site-navigation';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ runner?: string }>;
};

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'account' });
  return { title: t('metaTitle') };
}

export default async function AccountPage({ params, searchParams }: Props) {
  const locale = requireLocale((await params).locale);
  setRequestLocale(locale);

  const user = await getSignedInUser();
  if (!user.ok) return redirect({ href: '/sign-in', locale });

  const panels = await getAccountOverview(user.value.id);
  if (panels.length === 0) return redirect({ href: '/register', locale });

  const { runner: requested } = await searchParams;
  const selected = panels.find((panel) => panel.registration.id === requested) ?? panels[0];
  if (!selected) return redirect({ href: '/register', locale });

  const [settings, phone, signInMethod] = await Promise.all([
    getEventSettings(),
    accountDirectory.phoneOf(user.value.id),
    accounts.signInMethod(user.value.id),
  ]);

  const runners: AccountRunner[] = await Promise.all(
    panels.map(async (panel) => ({
      id: panel.registration.id,
      runnerName: panel.registration.runnerName,
      distance: panel.registration.distance,
      bibNumber: panel.registration.bibNumber,
      shirtName: panel.registration.shirtName,
      shirtSize: panel.registration.shirtSize,
      fee: formatMoney(panel.registration.feeCents, locale),
      stage: panel.stage,
      rejectionReason: panel.rejectionReason,
      ticket: panel.ticket
        ? {
            pdfUrl: `/api/tickets/${panel.ticket.id}/pdf?locale=${locale}`,
            qrDataUrl: await ticketQrDataUrl(panel.ticket),
          }
        : null,
      receipt:
        panel.stage === 'payment_in_review' && panel.payment
          ? {
              paymentId: panel.payment.id,
              url: `/api/receipts/${panel.payment.id}`,
              uploadedAt: panel.payment.receipt.uploadedAt,
            }
          : null,
    })),
  );

  const deadline = settings.shirtSizeDeadline ? new Date(settings.shirtSizeDeadline) : null;

  return (
    <PageShell navigation={<SiteNavigation />} actions={<SessionActions />}>
      <AccountView
        holder={{ name: user.value.name, email: user.value.email, phone }}
        signInMethod={signInMethod}
        saveAccount={saveAccountAction}
        signOut={signOutAction}
        whatsappUrl={settings.contact ? whatsappUrl(settings.contact.whatsapp) : null}
        runners={runners}
        selectedId={selected.registration.id}
        shirtSizes={settings.shirtSizes}
        sizeDeadline={deadline}
        sizeLocked={deadline !== null && appClock.now().getTime() > deadline.getTime()}
        facts={formatRunnerFacts(settings, selected.registration.distance, locale)}
        uploadMode={receiptUploadMode}
        userId={user.value.id}
        paymentOpen={isPaymentOpen(settings)}
        saveShirtName={saveShirtNameAction}
        saveDistance={saveDistanceAction}
        saveShirtSize={saveShirtSizeAction}
        recordReceipt={recordReceiptAction}
        replaceReceipt={replaceReceiptAction}
        removeRunner={removeRunnerAction}
      />
    </PageShell>
  );
}
