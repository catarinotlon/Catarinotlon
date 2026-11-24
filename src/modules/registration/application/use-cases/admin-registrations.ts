import { sendAfterCommit, type EmailSender } from '@/shared/domain/email';
import type { ErrorReporter } from '@/shared/domain/error-reporter';
import { err, ok, type DomainError, type Result } from '@/shared/domain/result';
import type { Clock, IdGenerator } from '@/shared/domain/system-ports';
import type { UnitOfWork } from '@/shared/domain/unit-of-work';

import {
  DISTANCES,
  parseDistance,
  type Distance,
  type InvalidDistance,
} from '../../domain/distance';
import {
  changeDistance,
  changeShirtName,
  changeShirtSize,
  type Registration,
  type RegistrationStatus,
} from '../../domain/registration';
import { parseShirtName, type ShirtNameRequired } from '../../domain/shirt-name';
import type { RegistrationAuditLog } from '../ports/registration-audit-log';
import type { RegistrationRepository } from '../ports/registration-repository';
import type { AccountEmailLookup, AccountLinks, RegistrationNotFound } from './runner-edits';

/** Filters of the admin registrations table. */
export interface RegistrationFilter {
  /** Free text matched against name, bib number, and shirt name. */
  readonly query?: string;
  /** Only this distance. */
  readonly distance?: string;
  /** Only this status. */
  readonly status?: string;
}

/** Counts shown at the top of the admin panel. */
export interface RegistrationTotals {
  /** All active registrations. */
  readonly total: number;
  /** Count per distance. */
  readonly byDistance: Readonly<Record<Distance, number>>;
  /** Count per lifecycle state. */
  readonly byStatus: Readonly<Record<RegistrationStatus, number>>;
}

const fold = (text: string): string =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/**
 * Filters registrations for the admin table.
 *
 * @remarks
 * The text search ignores accents and casing.
 *
 * @param all - The registrations.
 * @param filter - The filters.
 * @returns The matching registrations, in their original order.
 *
 * @example
 * ```ts
 * searchRegistrations(all, { query: 'sofia', distance: '5K' });
 * ```
 */
export function searchRegistrations(
  all: readonly Registration[],
  filter: RegistrationFilter,
): Registration[] {
  const query = fold(filter.query ?? '');
  return all.filter(
    (item) =>
      (!filter.distance || item.distance === filter.distance) &&
      (!filter.status || item.status === filter.status) &&
      (!query ||
        [item.runnerName, item.bibNumber, item.shirtName].some((text) =>
          fold(text).includes(query),
        )),
  );
}

/**
 * Counts registrations by distance and status.
 *
 * @param all - The registrations.
 * @returns The totals.
 */
export function registrationTotals(all: readonly Registration[]): RegistrationTotals {
  const count = (matches: (item: Registration) => boolean) => all.filter(matches).length;
  const [three, five] = DISTANCES;
  return {
    total: all.length,
    byDistance: {
      [three]: count((item) => item.distance === three),
      [five]: count((item) => item.distance === five),
    },
    byStatus: {
      pending_payment: count((item) => item.status === 'pending_payment'),
      payment_in_review: count((item) => item.status === 'payment_in_review'),
      confirmed: count((item) => item.status === 'confirmed'),
    },
  };
}

function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const csvRows = (rows: readonly (readonly string[])[]): string =>
  rows.map((row) => `${row.map(csvCell).join(',')}\r\n`).join('');

/**
 * Builds the registrations export.
 *
 * @remarks
 * Names are untrusted, so cells that a spreadsheet would run as a formula are
 * neutralized. The file is generated on request and never stored.
 *
 * @param all - The registrations.
 * @param headers - The localized column titles.
 * @returns CSV text.
 */
export function buildRegistrationsCsv(
  all: readonly Registration[],
  headers: Readonly<
    Record<'bibNumber' | 'runnerName' | 'distance' | 'shirtSize' | 'shirtName' | 'status', string>
  >,
): string {
  return csvRows([
    [
      headers.bibNumber,
      headers.runnerName,
      headers.distance,
      headers.shirtSize,
      headers.shirtName,
      headers.status,
    ],
    ...all.map((item) => [
      item.bibNumber,
      item.runnerName,
      item.distance,
      item.shirtSize,
      item.shirtName,
      item.status,
    ]),
  ]);
}

/**
 * Builds the shirt names export for the printer, grouped by size.
 *
 * @param all - The registrations.
 * @param sizes - The sizes on offer, in print order.
 * @param headers - The localized column titles.
 * @returns CSV text. Sizes no longer on offer come last.
 */
export function buildShirtNamesCsv(
  all: readonly Registration[],
  sizes: readonly string[],
  headers: Readonly<Record<'shirtSize' | 'shirtName' | 'runnerName', string>>,
): string {
  const rank = (size: string) => {
    const index = sizes.indexOf(size);
    return index === -1 ? sizes.length : index;
  };
  const ordered = [...all].sort((a, b) => rank(a.shirtSize) - rank(b.shirtSize));
  return csvRows([
    [headers.shirtSize, headers.shirtName, headers.runnerName],
    ...ordered.map((item) => [item.shirtSize, item.shirtName, item.runnerName]),
  ]);
}

/** Reads the shirt sizes currently on offer. */
export interface ShirtSizesReader {
  /**
   * Reads the sizes.
   *
   * @returns The sizes on offer.
   */
  read(): Promise<readonly string[]>;
}

/** Ports required by {@link adminEditRegistration}. */
export interface AdminEditDeps {
  /** Transaction runner over the registration and its audit log. */
  readonly unitOfWork: UnitOfWork<{
    readonly registrations: RegistrationRepository;
    readonly audit: RegistrationAuditLog;
  }>;
  /** Email sender. */
  readonly emails: EmailSender;
  /** Reporter of unexpected errors. */
  readonly reporter: ErrorReporter;
  /** Time source. */
  readonly clock: Clock;
  /** UUID source. */
  readonly ids: IdGenerator;
  /** Reader of the sizes on offer. */
  readonly shirtSizes: ShirtSizesReader;
  /** Account email lookup. */
  readonly contact: AccountEmailLookup;
  /** Email link builder. */
  readonly links: AccountLinks;
}

/** Input of {@link adminEditRegistration}. Omitted fields stay as they are. */
export interface AdminEditInput {
  /** The admin. The caller must have verified the role. */
  readonly adminId: string;
  /** The registration's UUID. */
  readonly registrationId: string;
  /** New runner name. */
  readonly runnerName?: string;
  /** New distance. */
  readonly distance?: string;
  /** New shirt size. Admins are not bound by the runner's deadline. */
  readonly shirtSize?: string;
  /** New shirt name. */
  readonly shirtName?: string;
}

/** Expected failures of {@link adminEditRegistration}. */
export type AdminEditError =
  | RegistrationNotFound
  | InvalidDistance
  | ShirtNameRequired
  | DomainError<'registration.runner_name_required'>
  | DomainError<'registration.invalid_shirt_size'>;

function applyEdit(
  registration: Registration,
  input: AdminEditInput,
  sizes: readonly string[],
  now: Date,
): Result<Registration, Exclude<AdminEditError, RegistrationNotFound>> {
  let next = registration;

  if (input.runnerName !== undefined) {
    const runnerName = input.runnerName.trim();
    if (!runnerName) return err('registration.runner_name_required');
    next = { ...next, runnerName };
  }
  if (input.distance !== undefined) {
    const distance = parseDistance(input.distance);
    if (!distance.ok) return distance;
    next = changeDistance(next, distance.value);
  }
  if (input.shirtSize !== undefined && input.shirtSize !== next.shirtSize) {
    if (!sizes.includes(input.shirtSize)) return err('registration.invalid_shirt_size');
    const resized = changeShirtSize(next, input.shirtSize, {
      now,
      deadline: null,
      actingAsAdmin: true,
    });
    if (resized.ok) next = resized.value;
  }
  if (input.shirtName !== undefined) {
    const shirtName = parseShirtName(input.shirtName);
    if (!shirtName.ok) return shirtName;
    next = changeShirtName(next, shirtName.value);
  }
  return ok(next);
}

/**
 * Corrects a registration as an admin, recording every changed field.
 *
 * @remarks
 * A changed shirt name sends the runner the "Shirt name updated" email.
 *
 * @param deps - The required ports.
 * @param input - The admin, the registration, and the changes.
 * @returns The updated registration, or an expected error.
 *
 * @example
 * ```ts
 * await adminEditRegistration(deps, { adminId, registrationId, shirtName: 'Sofi' });
 * ```
 */
export async function adminEditRegistration(
  deps: AdminEditDeps,
  input: AdminEditInput,
): Promise<Result<Registration, AdminEditError>> {
  const sizes = await deps.shirtSizes.read();
  const now = deps.clock.now();

  const outcome = await deps.unitOfWork.run(async ({ registrations, audit }) => {
    const registration = await registrations.findById(input.registrationId);
    if (!registration) return { result: err('registration.not_found' as const), before: null };

    const result = applyEdit(registration, input, sizes, now);
    if (!result.ok) return { result, before: registration };

    const fields = ['runnerName', 'distance', 'shirtSize', 'shirtName'] as const;
    const changed = fields.filter((field) => registration[field] !== result.value[field]);
    if (changed.length > 0) await registrations.update(result.value);
    for (const field of changed) {
      await audit.record({
        id: deps.ids.uuid(),
        registrationId: registration.id,
        changedBy: input.adminId,
        field,
        previousValue: registration[field],
        newValue: result.value[field],
        changedAt: now,
      });
    }
    return { result, before: registration };
  });

  if (!outcome.result.ok) return outcome.result;
  const updated = outcome.result.value;

  if (outcome.before && outcome.before.shirtName !== updated.shirtName) {
    const to = updated.ownerId ? await deps.contact.emailOf(updated.ownerId) : updated.contactEmail;
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
  }

  return ok(updated);
}
