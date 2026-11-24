import { err, ok, type DomainError, type Result } from '@/shared/domain/result';

import type { BibNumber } from './bib-number';
import type { Distance } from './distance';
import type { ShirtName } from './shirt-name';

/**
 * The persisted lifecycle states of a registration.
 *
 * @remarks
 * The fourth product state, `incomplete`, means the account has no registration
 * yet, so it belongs to the account. See {@link accountStage}.
 */
export type RegistrationStatus = 'pending_payment' | 'payment_in_review' | 'confirmed';

/** Where an account stands in the sign-up flow. */
export type AccountStage = 'incomplete' | 'registered';

/** The data needed to create a registration. */
export interface NewRegistration {
  /** Registration UUID. */
  readonly id: string;
  /** Owning account, or `null` for a manual registration with no account. */
  readonly ownerId: string | null;
  /** The runner's full name. */
  readonly runnerName: string;
  /** The race distance. */
  readonly distance: Distance;
  /** One of the shirt sizes configured in the event settings. */
  readonly shirtSize: string;
  /** The name printed on the back of the shirt. */
  readonly shirtName: ShirtName;
  /** The runner's bib number. */
  readonly bibNumber: BibNumber;
  /** The fee in force at creation, in cents. It never changes afterwards. */
  readonly feeCents: number;
  /** The locale used for this runner's emails. */
  readonly locale: string;
  /** When the registration was created. */
  readonly createdAt: Date;
  /** Contact email of a manual registration with no account. */
  readonly contactEmail?: string | null;
  /** Contact phone of a manual registration with no account. */
  readonly contactPhone?: string | null;
}

/** One runner's registration for the race. */
export interface Registration extends Omit<NewRegistration, 'contactEmail' | 'contactPhone'> {
  /** The current lifecycle state. */
  readonly status: RegistrationStatus;
  /** Contact email of a manual registration with no account. */
  readonly contactEmail: string | null;
  /** Contact phone of a manual registration with no account. */
  readonly contactPhone: string | null;
}

/** Context needed to decide whether a shirt size can change. */
export interface ShirtSizeChangeContext {
  /** The current time. */
  readonly now: Date;
  /** The configured deadline, or `null` while it is not set. */
  readonly deadline: Date | null;
  /** Admins can change the size after the deadline. */
  readonly actingAsAdmin?: boolean;
}

/** Error returned when a confirmed registration receives a receipt. */
export type AlreadyConfirmed = DomainError<'registration.already_confirmed'>;
/** Error returned when a review decision targets a registration not in review. */
export type NotInReview = DomainError<'registration.not_in_review'>;
/** Error returned when the shirt-size deadline has passed. */
export type ShirtSizeDeadlinePassed = DomainError<'registration.shirt_size_deadline_passed'>;

/**
 * Creates a registration awaiting payment.
 *
 * @param input - The registration data.
 * @returns A registration in `pending_payment`.
 *
 * @example
 * ```ts
 * const registration = createRegistration(input);
 * ```
 */
export function createRegistration(input: NewRegistration): Registration {
  return {
    ...input,
    contactEmail: input.contactEmail ?? null,
    contactPhone: input.contactPhone ?? null,
    status: 'pending_payment',
  };
}

/**
 * Derives the account's stage from its registrations.
 *
 * @param registrations - The account's registrations.
 * @returns `incomplete` when there are none, otherwise `registered`.
 */
export function accountStage(registrations: readonly Registration[]): AccountStage {
  return registrations.length === 0 ? 'incomplete' : 'registered';
}

/**
 * Marks a registration as having a receipt under review.
 *
 * @remarks
 * A registration already in review stays there, so its receipt can be replaced.
 *
 * @param registration - The registration.
 * @returns The updated registration, or `registration.already_confirmed`.
 */
export function submitForReview(
  registration: Registration,
): Result<Registration, AlreadyConfirmed> {
  if (registration.status === 'confirmed') return err('registration.already_confirmed');
  return ok({ ...registration, status: 'payment_in_review' });
}

/**
 * Returns a registration to `pending_payment` after its receipt is rejected.
 *
 * @remarks
 * The registration keeps its bib number and its place.
 *
 * @param registration - The registration.
 * @returns The updated registration, or `registration.not_in_review`.
 */
export function returnToPendingPayment(
  registration: Registration,
): Result<Registration, NotInReview> {
  if (registration.status !== 'payment_in_review') return err('registration.not_in_review');
  return ok({ ...registration, status: 'pending_payment' });
}

/**
 * Confirms a registration after an admin approves its payment.
 *
 * @param registration - The registration.
 * @returns The confirmed registration, or `registration.not_in_review`.
 */
export function confirmRegistration(registration: Registration): Result<Registration, NotInReview> {
  if (registration.status !== 'payment_in_review') return err('registration.not_in_review');
  return ok({ ...registration, status: 'confirmed' });
}

/**
 * Changes the shirt name, which is allowed at any time.
 *
 * @param registration - The registration.
 * @param shirtName - The new name.
 * @returns The updated registration.
 */
export function changeShirtName(registration: Registration, shirtName: ShirtName): Registration {
  return { ...registration, shirtName };
}

/**
 * Changes the distance, which is allowed at any time.
 *
 * @remarks
 * Both distances cost the same, so the stored fee and the status do not change.
 *
 * @param registration - The registration.
 * @param distance - The new distance.
 * @returns The updated registration.
 */
export function changeDistance(registration: Registration, distance: Distance): Registration {
  return { ...registration, distance };
}

/**
 * Changes the shirt size, subject to the configured deadline.
 *
 * @param registration - The registration.
 * @param shirtSize - The new size.
 * @param context - The current time, the deadline, and whether an admin is acting.
 * @returns The updated registration, or `registration.shirt_size_deadline_passed`.
 */
export function changeShirtSize(
  registration: Registration,
  shirtSize: string,
  context: ShirtSizeChangeContext,
): Result<Registration, ShirtSizeDeadlinePassed> {
  const { now, deadline, actingAsAdmin = false } = context;
  if (!actingAsAdmin && deadline !== null && now.getTime() > deadline.getTime()) {
    return err('registration.shirt_size_deadline_passed');
  }
  return ok({ ...registration, shirtSize });
}
