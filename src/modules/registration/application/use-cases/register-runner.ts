import { err, ok, type DomainError, type Result } from '@/shared/domain/result';
import type { Clock, IdGenerator, RandomSource } from '@/shared/domain/system-ports';

import { bibNumberFromRandom } from '../../domain/bib-number';
import { parseDistance, type InvalidDistance } from '../../domain/distance';
import { createRegistration, type Registration } from '../../domain/registration';
import { parseShirtName, type ShirtNameRequired } from '../../domain/shirt-name';
import type { RegistrationRepository } from '../ports/registration-repository';
import type { RegistrationSettingsReader } from '../ports/registration-settings-reader';

const MAX_BIB_ATTEMPTS = 10;

/** Ports required by {@link registerRunner}. */
export interface RegisterRunnerDeps {
  /** Registration storage. */
  readonly registrations: RegistrationRepository;
  /** Reader of the fee and the shirt sizes. */
  readonly settings: RegistrationSettingsReader;
  /** Time source. */
  readonly clock: Clock;
  /** UUID source. */
  readonly ids: IdGenerator;
  /** Random source for bib numbers. */
  readonly random: RandomSource;
}

/** Input of {@link registerRunner}. */
export interface RegisterRunnerInput {
  /** The owning account, or `null` for a manual registration with no account. */
  readonly ownerId: string | null;
  /** Contact email of a manual registration. */
  readonly contactEmail?: string | null;
  /** Contact phone of a manual registration. */
  readonly contactPhone?: string | null;
  /** The runner's full name. */
  readonly runnerName: string;
  /** The requested distance. */
  readonly distance: string;
  /** The requested shirt size. */
  readonly shirtSize: string;
  /** The name for the back of the shirt. */
  readonly shirtName: string;
  /** The locale for this runner's emails. */
  readonly locale: string;
}

/** Expected failures of {@link registerRunner}. */
export type RegisterRunnerError =
  | InvalidDistance
  | ShirtNameRequired
  | DomainError<'registration.not_open'>
  | DomainError<'registration.invalid_shirt_size'>
  | DomainError<'registration.runner_name_required'>
  | DomainError<'registration.bib_number_exhausted'>;

/**
 * Registers one runner under an account.
 *
 * @remarks
 * The registration stores the fee in force today. Bib numbers are random and
 * retried on collision, a bounded number of times.
 *
 * @param deps - The required ports.
 * @param input - The runner's data.
 * @returns The new registration, or an expected error.
 *
 * @example
 * ```ts
 * const result = await registerRunner(deps, {
 *   ownerId, runnerName, distance: '5K', shirtSize, shirtName, locale: 'es',
 * });
 * ```
 */
export async function registerRunner(
  deps: RegisterRunnerDeps,
  input: RegisterRunnerInput,
): Promise<Result<Registration, RegisterRunnerError>> {
  const settings = await deps.settings.read();
  if (!settings) return err('registration.not_open');

  const runnerName = input.runnerName.trim();
  if (!runnerName) return err('registration.runner_name_required');

  const distance = parseDistance(input.distance);
  if (!distance.ok) return distance;

  if (!settings.shirtSizes.includes(input.shirtSize)) {
    return err('registration.invalid_shirt_size');
  }

  const shirtName = parseShirtName(input.shirtName);
  if (!shirtName.ok) return shirtName;

  const id = deps.ids.uuid();
  for (let attempt = 0; attempt < MAX_BIB_ATTEMPTS; attempt++) {
    const registration = createRegistration({
      id,
      ownerId: input.ownerId,
      runnerName,
      distance: distance.value,
      shirtSize: input.shirtSize,
      shirtName: shirtName.value,
      bibNumber: bibNumberFromRandom(deps.random.next()),
      feeCents: settings.feeCents,
      locale: input.locale,
      createdAt: deps.clock.now(),
      contactEmail: input.contactEmail?.trim() || null,
      contactPhone: input.contactPhone?.trim() || null,
    });

    const inserted = await deps.registrations.insert(registration);
    if (inserted.ok) return ok(registration);
  }

  return err('registration.bib_number_exhausted');
}
