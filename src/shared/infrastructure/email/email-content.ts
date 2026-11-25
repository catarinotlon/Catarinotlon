import { createFormatter, createTranslator } from 'next-intl';

import { formatMoney } from '@/i18n/money';
import { DATE_AND_TIME_FORMAT, formatStartTime } from '@/i18n/start-time';
import type { EmailMessage, EmailRunner } from '@/shared/domain/email';
import { firstName } from '@/shared/domain/person-name';

import en from '../../../../messages/en.json';
import es from '../../../../messages/es.json';

/** The event facts an email can show. It never includes the bank data. */
export interface EmailEventContext {
  /** The race date, as `YYYY-MM-DD`. */
  readonly eventDate: string | null;
  /** The start time of each distance, as `HH:mm`. */
  readonly startTimes: { readonly '3K': string | null; readonly '5K': string | null };
  /** The venue, per locale. */
  readonly venue: { readonly es: string; readonly en: string } | null;
  /** Kit pickup information, per locale. */
  readonly kitPickup: { readonly es: string; readonly en: string } | null;
  /** The payment contact. */
  readonly contact: {
    readonly fullName: string;
    readonly phone: string;
    readonly email: string;
    readonly whatsapp: string;
    readonly hours: { readonly es: string; readonly en: string };
  } | null;
}

/** The context before any event setting exists. */
export const EMPTY_EMAIL_CONTEXT: EmailEventContext = {
  eventDate: null,
  startTimes: { '3K': null, '5K': null },
  venue: null,
  kitPickup: null,
  contact: null,
};

/** A titled block of an email. */
export interface EmailSection {
  /** The block's heading. */
  title: string;
  /** Its paragraph. */
  body?: string;
  /** Label and value pairs. */
  details?: readonly (readonly [string, string])[];
  /** A small closing line. */
  note?: string;
}

/** The ticket card of a confirmed registration. */
export interface EmailTicket {
  /** The label above the runner's name. */
  label: string;
  /** The runner's full name. */
  runnerName: string;
  /** The race distance. */
  distance: string;
  /** Label and value pairs. */
  rows: readonly (readonly [string, string])[];
  /** The bib, shown next to the QR on the ticket's stub. */
  stub: { label: string; value: string };
}

/** The localized content of one email, independent of its layout. */
export interface EmailContent {
  /** The subject line. */
  subject: string;
  /** The main heading. */
  title: string;
  /** The opening paragraph. */
  body: string;
  /** Text shown large, such as the shirt name. */
  highlight?: string;
  /** Label and value pairs. */
  details: readonly (readonly [string, string])[];
  /** The ticket card of a confirmed registration. */
  ticket?: EmailTicket;
  /** A boxed message, such as a rejection's reason. */
  callout?: { title: string; body: string };
  /** Whether the email shows the ticket QR. */
  qrAlt?: string;
  /** Titled blocks after the details. */
  sections?: readonly EmailSection[];
  /** Whether the titled blocks come after the actions. */
  sectionsAfterActions?: boolean;
  /** A line just before the main action. */
  lead?: string;
  /** The main action. */
  cta?: { label: string; url: string };
  /** A closing note. */
  note?: string;
  /** Who to contact about a payment. */
  contactLine?: string;
  /** The reason the recipient got this email. */
  footer: string;
  /** The address to write to, in a runner's footer. */
  footerContact?: string;
  /** A label next to the logo, on admin emails. */
  badge?: string;
}

/**
 * Builds the localized content of an email.
 *
 * @param message - The email.
 * @param context - The current event facts.
 * @returns Its subject, text, details, and action.
 */
export function buildEmailContent(
  message: EmailMessage,
  context: EmailEventContext = EMPTY_EMAIL_CONTEXT,
): EmailContent {
  const locale = message.locale === 'en' ? 'en' : 'es';
  const t = createTranslator({ locale, messages: locale === 'en' ? en : es, namespace: 'emails' });
  const format = createFormatter({ locale, timeZone: 'America/Mexico_City' });
  const money = (cents: number) => formatMoney(cents, locale);
  const list = (items: readonly string[]) => format.list(items, { type: 'conjunction' });
  const pending = t('common.pending');
  const localized = (text: { es: string; en: string } | null) =>
    (text?.[locale] || null) ?? pending;
  const eventDate = context.eventDate
    ? format.dateTime(new Date(`${context.eventDate}T12:00:00Z`), { dateStyle: 'long' })
    : pending;
  const startOf = (distance: string) => {
    const time = context.startTimes[distance === '3K' ? '3K' : '5K'];
    if (!time) return pending;
    return formatStartTime(time, locale);
  };
  const sentAt = (date: Date) => format.dateTime(date, DATE_AND_TIME_FORMAT);
  const contactLine = context.contact
    ? {
        contactLine: t('common.questions', {
          name: context.contact.fullName,
          phone: context.contact.phone,
          hours: context.contact.hours[locale],
        }),
      }
    : {};
  const footerContact = context.contact ? { footerContact: context.contact.email } : {};
  const runnerList = (runners: readonly EmailRunner[]) =>
    list(runners.map(({ name, distance }) => t('common.runnerWithDistance', { name, distance })));

  switch (message.template) {
    case 'verify_email':
      return {
        subject: t('verify_email.subject'),
        title: t('verify_email.title'),
        body: t('verify_email.body', { name: message.data.name }),
        details: [],
        cta: { label: t('verify_email.cta'), url: message.data.url },
        note: t('verify_email.note'),
        footer: t('common.footerCreated'),
        ...footerContact,
      };
    case 'reset_password':
      return {
        subject: t('reset_password.subject'),
        title: t('reset_password.title'),
        body: t('reset_password.body', { name: message.data.name }),
        details: [],
        cta: { label: t('reset_password.cta'), url: message.data.url },
        note: t('reset_password.note'),
        footer: t('common.footerAccount'),
        ...footerContact,
      };
    case 'registration_confirmed':
      return {
        subject: t('registration_confirmed.subject'),
        title: t('registration_confirmed.title', {
          runnerName: firstName(message.data.runnerName),
        }),
        body: t('registration_confirmed.body'),
        details: [],
        ticket: {
          label: t('registration_confirmed.runner'),
          runnerName: message.data.runnerName,
          distance: message.data.distance,
          rows: [
            [t('common.date'), eventDate],
            [t('common.start'), startOf(message.data.distance)],
            [t('common.venue'), localized(context.venue)],
            [t('registration_confirmed.bib'), message.data.bibNumber],
            [t('common.size'), message.data.shirtSize],
            [t('registration_confirmed.shirt'), message.data.shirtName],
          ],
          stub: { label: t('registration_confirmed.bibStub'), value: message.data.bibNumber },
        },
        qrAlt: t('registration_confirmed.qrAlt'),
        sectionsAfterActions: true,
        sections: [
          {
            title: t('common.kitPickup'),
            body: localized(context.kitPickup),
            note: t('registration_confirmed.note'),
          },
        ],
        ...(message.data.accountUrl
          ? {
              lead: t('registration_confirmed.pdfHowTo'),
              cta: { label: t('registration_confirmed.viewTicket'), url: message.data.accountUrl },
            }
          : {}),
        footer: t('common.footerRunner'),
        ...footerContact,
      };
    case 'race_reminder':
      return {
        subject: t('race_reminder.subject', { daysLeft: message.data.daysLeft }),
        title: t('race_reminder.title', { daysLeft: message.data.daysLeft }),
        body: t('race_reminder.body', {
          runnerName: message.data.runnerName,
          distance: message.data.distance,
        }),
        details: [],
        sections: [
          {
            title: t('race_reminder.step1'),
            body: localized(context.kitPickup),
            note: t('race_reminder.step1Note'),
          },
          {
            title: t('race_reminder.step2'),
            details: [
              [t('common.date'), eventDate],
              [t('common.start'), startOf(message.data.distance)],
              [t('common.venue'), localized(context.venue)],
            ],
          },
          { title: t('race_reminder.step3'), body: t('race_reminder.step3Body') },
        ],
        cta: { label: t('race_reminder.cta'), url: message.data.accountUrl },
        footer: t('common.footerRunner'),
        ...footerContact,
      };
    case 'shirt_name_updated':
      return {
        subject: t('shirt_name_updated.subject'),
        title: t('shirt_name_updated.title'),
        body: t('shirt_name_updated.body', { runnerName: message.data.runnerName }),
        highlight: message.data.shirtName,
        details: [],
        cta: { label: t('shirt_name_updated.cta'), url: message.data.accountUrl },
        lead: context.contact
          ? `${t('shirt_name_updated.note')} ${t('shirt_name_updated.noteContact', {
              email: context.contact.email,
            })}`
          : t('shirt_name_updated.note'),
        footer: t('common.footerRunner'),
        ...footerContact,
      };
    case 'receipt_received':
      return {
        subject: t('receipt_received.subject'),
        title: t('receipt_received.title'),
        body: t('receipt_received.body'),
        details: [
          [t('common.registration'), runnerList(message.data.runners)],
          [t('common.amount'), money(message.data.amountCents)],
          [t('common.receiptSent'), sentAt(message.data.uploadedAt)],
        ],
        lead: t('receipt_received.note'),
        cta: { label: t('receipt_received.cta'), url: message.data.accountUrl },
        ...contactLine,
        footer: t('common.footerRunner'),
        ...footerContact,
      };
    case 'receipt_rejected':
      return {
        subject: t('receipt_rejected.subject'),
        title: t('receipt_rejected.title'),
        body: t('receipt_rejected.body'),
        details: [],
        callout: { title: t('common.reasonLabel'), body: message.data.reason },
        sections: [
          { title: t('receipt_rejected.nextTitle'), body: t('receipt_rejected.nextBody') },
        ],
        cta: { label: t('receipt_rejected.cta'), url: message.data.uploadUrl },
        ...contactLine,
        footer: t('common.footerRunner'),
        ...footerContact,
      };
    case 'admin_new_receipt':
      return {
        subject: t('admin_new_receipt.subject', { uploaderName: message.data.uploaderName }),
        title: t('admin_new_receipt.title'),
        body: t('admin_new_receipt.body', { uploaderName: message.data.uploaderName }),
        badge: t('common.adminBadge'),
        details: [
          [t('common.account'), message.data.uploaderName],
          [
            t('admin_new_receipt.covers'),
            t('admin_new_receipt.coversValue', {
              count: message.data.runners.length,
              names: runnerList(message.data.runners),
            }),
          ],
          [t('admin_new_receipt.expected'), money(message.data.amountCents)],
          [t('admin_new_receipt.concept'), message.data.concept],
          [t('common.sent'), sentAt(message.data.uploadedAt)],
        ],
        cta: { label: t('admin_new_receipt.cta'), url: message.data.reviewUrl },
        note: t('admin_new_receipt.note'),
        footer: t('common.footerAdmin'),
      };
    case 'bank_data_changed':
      return {
        subject: t('bank_data_changed.subject'),
        title: t('bank_data_changed.title'),
        badge: t('common.adminBadge'),
        body: t('bank_data_changed.body', { changedBy: message.data.changedBy }),
        details: [],
        cta: { label: t('bank_data_changed.cta'), url: message.data.settingsUrl },
        note: t('bank_data_changed.note'),
        footer: t('common.footerAdmin'),
      };
    case 'admin_granted':
      return {
        subject: t('admin_granted.subject'),
        title: t('admin_granted.title'),
        badge: t('common.adminBadge'),
        body: t('admin_granted.body', { grantedBy: message.data.grantedBy }),
        details: [],
        cta: { label: t('admin_granted.cta'), url: message.data.signInUrl },
        note: t('admin_granted.note'),
        footer: t('common.footerAdmin'),
      };
  }
}
