import {
  createRegistration,
  InMemoryRegistrationRepository,
  type BibNumber,
  type Registration,
  type ShirtName,
} from '@/modules/registration';
import { InMemoryTicketRepository } from '@/modules/ticketing';
import { InMemoryEmailSender } from '@/shared/domain/email';
import { InMemoryErrorReporter } from '@/shared/domain/error-reporter';
import type { UnitOfWork } from '@/shared/domain/unit-of-work';

import { InMemoryPaymentRepository } from '../../infrastructure/in-memory-payment-repository';
import type { ReceiptFile } from '../../domain/payment';
import type { PaymentContacts, PaymentLinks, PaymentRepositories } from '../ports/payment-support';

/** The fixed time used by payment tests. */
export const NOW = new Date('2026-06-01T12:00:00.000Z');

/** A receipt fixture. */
export const receipt: ReceiptFile = {
  pathname: 'receipts/first.pdf',
  contentType: 'application/pdf',
  sizeBytes: 1000,
  uploadedAt: NOW,
};

/** Builds the in-memory ports shared by the payment use case tests. */
export function createPaymentsKit() {
  const payments = new InMemoryPaymentRepository();
  const registrations = new InMemoryRegistrationRepository();
  const tickets = new InMemoryTicketRepository();
  const emails = new InMemoryEmailSender();
  const repositories: PaymentRepositories = { payments, registrations, tickets };
  const unitOfWork: UnitOfWork<PaymentRepositories> = { run: (work) => work(repositories) };

  let nextId = 0;
  const ids = { uuid: () => `generated-${++nextId}` };
  const clock = { now: () => NOW };

  const contacts: PaymentContacts = {
    accountHolder: async (userId) =>
      userId === 'user-1'
        ? { name: 'Holder One', email: 'holder@example.test', locale: 'es' }
        : null,
    adminEmails: async () => ['admin-a@example.test', 'admin-b@example.test'],
  };

  const links: PaymentLinks = {
    account: (locale) => `https://app.test/${locale}/account`,
    payment: (locale) => `https://app.test/${locale}/payment`,
    adminPayment: (id, locale) => `https://app.test/${locale}/admin/payments/${id}`,
    ticketPdf: (id, locale) => `https://app.test/${locale}/tickets/${id}.pdf`,
  };

  let bib = 20000;
  async function addRegistration(
    overrides: Partial<Registration> & { id: string },
  ): Promise<Registration> {
    const registration: Registration = {
      ...createRegistration({
        id: overrides.id,
        ownerId: 'user-1',
        runnerName: `Runner ${overrides.id}`,
        distance: '5K',
        shirtSize: 'size-a',
        shirtName: 'NAME' as ShirtName,
        bibNumber: String(++bib) as BibNumber,
        feeCents: 10000,
        locale: 'es',
        createdAt: NOW,
      }),
      ...overrides,
    };
    await registrations.insert(registration);
    return registration;
  }

  return {
    payments,
    registrations,
    tickets,
    emails,
    reporter: new InMemoryErrorReporter(),
    unitOfWork,
    ids,
    clock,
    contacts,
    links,
    availability: { isOpen: async () => true },
    addRegistration,
  };
}
