import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import {
  accountDirectory,
  findPayment,
  findRegistration,
  getAdminUser,
  isOwner,
  getEventSettings,
} from '@/composition';
import { requireLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import {
  confirmPaymentAction,
  rejectPaymentAction,
} from '@/modules/payments/presentation/admin-actions';
import { AdminShell } from '@/modules/payments/presentation/admin-shell';
import { PaymentReviewPanel } from '@/modules/payments/presentation/payment-review-panel';
import { StatusPill } from '@/shared/ui/status-pill';
import { SessionActions } from '@/app/[locale]/_chrome/session-actions';
import { SiteNavigation } from '@/app/[locale]/_chrome/site-navigation';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'admin.review' });
  return { title: t('metaTitle'), robots: { index: false } };
}

export default async function AdminPaymentPage({ params }: Props) {
  const { locale: rawLocale, id } = await params;
  const locale = requireLocale(rawLocale);
  setRequestLocale(locale);
  if (!(await getAdminUser()).ok) notFound();

  const payment = await findPayment(id);
  if (!payment) notFound();

  const [t, admin, holder, phone, settings, covered] = await Promise.all([
    getTranslations({ locale, namespace: 'admin.review' }),
    getTranslations({ locale, namespace: 'admin' }),
    accountDirectory.accountHolder(payment.ownerId),
    accountDirectory.phoneOf(payment.ownerId),
    getEventSettings(),
    Promise.all(payment.registrationIds.map((registrationId) => findRegistration(registrationId))),
  ]);

  return (
    <AdminShell
      navigation={<SiteNavigation />}
      actions={<SessionActions />}
      canManageAdmins={await isOwner()}
    >
      <div className="flex flex-col gap-4">
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2"
        >
          {admin('back')}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 font-heading text-5xl">{t('title')}</h1>
          {payment.status === 'in_review' && (
            <StatusPill tone="gold">{admin('list.state.in_review')}</StatusPill>
          )}
        </div>
        <PaymentReviewPanel
          data={{
            paymentId: payment.id,
            status: payment.status,
            receiptUrl: `/api/receipts/${payment.id}`,
            receiptIsImage: payment.receipt.contentType.startsWith('image/'),
            uploadedAt: payment.receipt.uploadedAt,
            holderName: holder?.name ?? '',
            holderEmail: holder?.email ?? '',
            holderPhone: phone,
            runners: covered.flatMap((runner) =>
              runner
                ? [
                    {
                      id: runner.id,
                      name: runner.runnerName,
                      distance: runner.distance,
                      bib: runner.bibNumber,
                    },
                  ]
                : [],
            ),
            amountCents: payment.amountCents,
            clabe: settings.bank?.clabe ?? null,
            concept: payment.concept,
            rejectionReason: payment.rejectionReason,
            reviewedAt: payment.reviewedAt,
          }}
          confirmAction={confirmPaymentAction}
          rejectAction={rejectPaymentAction}
        />
      </div>
    </AdminShell>
  );
}
