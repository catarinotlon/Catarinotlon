import { sendAfterCommit, type EmailSender } from '@/shared/domain/email';
import type { ErrorReporter } from '@/shared/domain/error-reporter';
import { err, ok, type DomainError, type Result } from '@/shared/domain/result';
import type { Clock, IdGenerator } from '@/shared/domain/system-ports';

import { parseDistance, type InvalidDistance } from '../../domain/distance';
import {
  changeDistance,
  changeShirtName,
  changeShirtSize,
  type Registration,
  type ShirtSizeDeadlinePassed,
} from '../../domain/registration';
import { parseShirtName, type ShirtNameRequired } from '../../domain/shirt-name';
import type { RegistrationRepository } from '../ports/registration-repository';

/** Error returned when a registration is missing or belongs to someone else. */
export type RegistrationNotFound = DomainError<'registration.not_found'>;

/** The event rules that apply to a shirt-size change. */
export interface ShirtRulesReader {
  /**
   * Reads the current rules.
   *
   * @returns The deadline, if set, and the sizes on offer.
   */
  read(): Promise<{ deadline: Date | null; shirtSizes: readonly string[] }>;
}

/** Finds where to send an account holder's email. */
export interface AccountEmailLookup {
  /**
   * Finds the account's email address.
   *
   * @param userId - The account's user ID.
   * @returns The address, or `null`.
   */
  emailOf(userId: string): Promise<string | null>;
}

/** Builds links to the account page for emails. */
export interface AccountLinks {
  /**
   * Builds the account link.
   *
   * @param locale - The email's locale.
   * @returns The absolute URL of the account page.
   */
  account(locale: string): string;
}

/** Ports required by the runner edit use cases. */
export interface RunnerEditDeps {
  /** Registration storage. */
  readonly registrations: RegistrationRepository;
  /** Email sender. */
  readonly emails: EmailSender;
  /** Reporter of unexpected errors. */
  readonly reporter: ErrorReporter;
  /** Time source. */
  readonly clock: Clock;
  /** UUID source, used for email idempotency keys. */
  readonly ids: IdGenerator;
  /** Shirt-size rules. */
  readonly shirtRules: ShirtRulesReader;
  /** Account email lookup. */
  readonly contact: AccountEmailLookup;
  /** Email link builder. */
  readonly links: AccountLinks;
}

/** Identifies the registration being edited and who is editing it. */
export interface RunnerEdit {
  /** The signed-in user. */
  readonly userId: string;
  /** The registration's UUID. */
  readonly registrationId: string;
}

async function findOwned(
  registrations: RegistrationRepository,
  edit: RunnerEdit,
): Promise<Registration | null> {
  const registration = await registrations.findById(edit.registrationId);
  return registration?.ownerId === edit.userId ? registration : null;
}

/**
 * Lists the runners registered under an account.
 *
 * @param deps - The registration repository.
 * @param input - The signed-in user.
 * @returns The account's registrations, oldest first.
 *
 * @example
 * ```ts
 * const runners = await listAccountRunners(deps, { userId });
 * ```
 */
export async function listAccountRunners(
  deps: Pick<RunnerEditDeps, 'registrations'>,
  input: { readonly userId: string },
): Promise<Registration[]> {
  return deps.registrations.listByOwner(input.userId);
}

/**
 * Changes a runner's shirt name and tells the account holder.
 *
 * @param deps - The required ports.
 * @param input - The edit and the new name.
 * @returns The updated registration, or an expected error.
 *
 * @example
 * ```ts
 * await changeRunnerShirtName(deps, { userId, registrationId, shirtName: 'Sofi' });
 * ```
 */
export async function changeRunnerShirtName(
  deps: RunnerEditDeps,
  input: RunnerEdit & { readonly shirtName: string },
): Promise<Result<Registration, RegistrationNotFound | ShirtNameRequired>> {
  const registration = await findOwned(deps.registrations, input);
  if (!registration) return err('registration.not_found');

  const shirtName = parseShirtName(input.shirtName);
  if (!shirtName.ok) return shirtName;
  if (shirtName.value === registration.shirtName) return ok(registration);

  const updated = changeShirtName(registration, shirtName.value);
  await deps.registrations.update(updated);

  const to = await deps.contact.emailOf(input.userId);
  if (to) {
    await sendAfterCommit(deps, {
      template: 'shirt_name_updated',
      to,
      locale: updated.locale,
      idempotencyKey: `shirt_name_updated:${updated.id}:${deps.ids.uuid()}`,
      data: {
        runnerName: updated.runnerName,
        shirtName: updated.shirtName,
        accountUrl: deps.links.account(updated.locale),
      },
    });
  }

  return ok(updated);
}

/**
 * Changes a runner's distance, which is allowed at any time.
 *
 * @param deps - The registration repository.
 * @param input - The edit and the new distance.
 * @returns The updated registration, or an expected error.
 *
 * @example
 * ```ts
 * await changeRunnerDistance(deps, { userId, registrationId, distance: '3K' });
 * ```
 */
export async function changeRunnerDistance(
  deps: Pick<RunnerEditDeps, 'registrations'>,
  input: RunnerEdit & { readonly distance: string },
): Promise<Result<Registration, RegistrationNotFound | InvalidDistance>> {
  const registration = await findOwned(deps.registrations, input);
  if (!registration) return err('registration.not_found');

  const distance = parseDistance(input.distance);
  if (!distance.ok) return distance;

  const updated = changeDistance(registration, distance.value);
  await deps.registrations.update(updated);
  return ok(updated);
}

/**
 * Changes a runner's shirt size, until the configured deadline.
 *
 * @param deps - The required ports.
 * @param input - The edit and the new size.
 * @returns The updated registration, or an expected error.
 *
 * @example
 * ```ts
 * await changeRunnerShirtSize(deps, { userId, registrationId, shirtSize });
 * ```
 */
export async function changeRunnerShirtSize(
  deps: Pick<RunnerEditDeps, 'registrations' | 'shirtRules' | 'clock'>,
  input: RunnerEdit & { readonly shirtSize: string },
): Promise<
  Result<
    Registration,
    RegistrationNotFound | ShirtSizeDeadlinePassed | DomainError<'registration.invalid_shirt_size'>
  >
> {
  const registration = await findOwned(deps.registrations, input);
  if (!registration) return err('registration.not_found');

  const rules = await deps.shirtRules.read();
  if (!rules.shirtSizes.includes(input.shirtSize)) return err('registration.invalid_shirt_size');

  const updated = changeShirtSize(registration, input.shirtSize, {
    now: deps.clock.now(),
    deadline: rules.deadline,
  });
  if (!updated.ok) return updated;

  await deps.registrations.update(updated.value);
  return updated;
}
