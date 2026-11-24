import type { RegistrationRepository } from '@/modules/registration';
import type { TicketRepository } from '@/modules/ticketing';

import type { PaymentRepository } from './payment-repository';

/** The repositories that change together when a payment moves. */
export interface PaymentRepositories {
  /** Payment storage. */
  readonly payments: PaymentRepository;
  /** Registration storage. */
  readonly registrations: RegistrationRepository;
  /** Ticket storage. */
  readonly tickets: TicketRepository;
}

/** Contact data of an account holder. */
export interface AccountContact {
  /** The holder's full name. */
  readonly name: string;
  /** The holder's email address. */
  readonly email: string;
  /** The holder's preferred locale. */
  readonly locale: string;
}

/** Looks up who to contact about a payment. */
export interface PaymentContacts {
  /**
   * Finds an account holder's contact data.
   *
   * @param userId - The account's user ID.
   * @returns The contact, or `null` when the account has none.
   */
  accountHolder(userId: string): Promise<AccountContact | null>;

  /**
   * Lists the admin email addresses.
   *
   * @returns The addresses on the admin allowlist.
   */
  adminEmails(): Promise<readonly string[]>;
}

/** Builds absolute links for emails. */
export interface PaymentLinks {
  /** @returns The runner's account page. */
  account(locale: string): string;
  /** @returns The page where a new receipt can be uploaded. */
  payment(locale: string): string;
  /** @returns The admin review screen of a payment. */
  adminPayment(paymentId: string, locale: string): string;
  /** @returns The PDF download of a ticket. */
  ticketPdf(ticketId: string, locale: string): string;
}

/** Tells whether the settings needed to take payments exist. */
export interface PaymentAvailability {
  /** @returns `true` once the fee and the bank data are configured. */
  isOpen(): Promise<boolean>;
}
