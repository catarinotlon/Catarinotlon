import { parseClabe, type InvalidClabe } from '@/shared/domain/clabe';
import { err, ok, type DomainError, type Result } from '@/shared/domain/result';

/** Free text shown to runners, stored per locale. */
export interface LocalizedText {
  /** Spanish text. */
  readonly es: string;
  /** English text. */
  readonly en: string;
}

/** The administrator's contact card. */
export interface PaymentContact {
  /** Full name. */
  readonly fullName: string;
  /** Phone number. */
  readonly phone: string;
  /** Email address. */
  readonly email: string;
  /** WhatsApp number, as used in a `wa.me` link. */
  readonly whatsapp: string;
  /** Contact hours. */
  readonly hours: LocalizedText;
}

/** The protected bank data shown on the payment page. */
export interface BankData {
  /** The beneficiary's full name. */
  readonly beneficiary: string;
  /** The bank's name. */
  readonly bank: string;
  /** The 18-digit CLABE. */
  readonly clabe: string;
}

/**
 * The event facts owned by the organizer.
 *
 * @remarks
 * Every value starts missing. Nothing here may be seeded with invented data.
 */
export interface EventSettingsValues {
  /** The race date, as `YYYY-MM-DD`. */
  readonly eventDate: string | null;
  /** The start time of each distance, as `HH:mm`. */
  readonly startTimes: { readonly '3K': string | null; readonly '5K': string | null };
  /** The venue. */
  readonly venue: LocalizedText | null;
  /** Kit pickup information. */
  readonly kitPickup: LocalizedText | null;
  /** Link to the route map. */
  readonly routeMapUrl: string | null;
  /** The registration fee, in cents. */
  readonly feeCents: number | null;
  /** The shirt sizes on offer. */
  readonly shirtSizes: readonly string[];
  /** The last moment a runner can change their shirt size, as ISO 8601. */
  readonly shirtSizeDeadline: string | null;
  /** The administrator's contact card. */
  readonly contact: PaymentContact | null;
  /** The bank data. */
  readonly bank: BankData | null;
}

/** The name of one event setting. */
export type SettingKey = keyof EventSettingsValues;

/** Settings before an admin has entered anything. */
export const EMPTY_SETTINGS: EventSettingsValues = {
  eventDate: null,
  startTimes: { '3K': null, '5K': null },
  venue: null,
  kitPickup: null,
  routeMapUrl: null,
  feeCents: null,
  shirtSizes: [],
  shirtSizeDeadline: null,
  contact: null,
  bank: null,
};

const SETTING_KEYS = Object.keys(EMPTY_SETTINGS) as SettingKey[];

/** Expected failures of {@link validateSettings}. */
export type InvalidSettings =
  | InvalidClabe
  | DomainError<'event.invalid_fee'>
  | DomainError<'event.incomplete_bank_data'>
  | DomainError<'event.invalid_shirt_sizes'>;

const hasBothLocales = (text: LocalizedText | null): boolean =>
  Boolean(text?.es.trim() && text.en.trim());

/**
 * Lists the settings that are still missing.
 *
 * @param values - The current settings.
 * @returns The missing keys, in display order.
 */
export function missingSettings(values: EventSettingsValues): SettingKey[] {
  const present: Record<SettingKey, boolean> = {
    eventDate: Boolean(values.eventDate),
    startTimes: Boolean(values.startTimes['3K'] && values.startTimes['5K']),
    venue: hasBothLocales(values.venue),
    kitPickup: hasBothLocales(values.kitPickup),
    routeMapUrl: Boolean(values.routeMapUrl),
    feeCents: values.feeCents !== null,
    shirtSizes: values.shirtSizes.length > 0,
    shirtSizeDeadline: Boolean(values.shirtSizeDeadline),
    contact: values.contact !== null,
    bank: values.bank !== null,
  };
  return SETTING_KEYS.filter((key) => !present[key]);
}

/**
 * Tells whether runners can reach the transfer screen.
 *
 * @param values - The current settings.
 * @returns `true` once the fee and the bank data exist.
 */
export function isPaymentOpen(values: EventSettingsValues): boolean {
  return values.feeCents !== null && values.bank !== null;
}

/**
 * Validates settings before they are saved.
 *
 * @remarks
 * Missing values are allowed, because the organizer fills them in over time.
 *
 * @param values - The settings to validate.
 * @returns The same settings, or an error code.
 */
export function validateSettings(
  values: EventSettingsValues,
): Result<EventSettingsValues, InvalidSettings> {
  const { feeCents, bank, shirtSizes } = values;

  if (feeCents !== null && (!Number.isInteger(feeCents) || feeCents <= 0)) {
    return err('event.invalid_fee');
  }

  if (bank) {
    if (!bank.beneficiary.trim() || !bank.bank.trim()) return err('event.incomplete_bank_data');
    const clabe = parseClabe(bank.clabe);
    if (!clabe.ok) return clabe;
  }

  const sizes = shirtSizes.map((size) => size.trim());
  if (sizes.some((size) => !size) || new Set(sizes).size !== sizes.length) {
    return err('event.invalid_shirt_sizes');
  }

  return ok(values);
}

/**
 * Compares two versions of the settings.
 *
 * @param previous - The earlier version.
 * @param next - The later version.
 * @returns The keys whose values differ.
 */
export function changedFields(
  previous: EventSettingsValues,
  next: EventSettingsValues,
): SettingKey[] {
  return SETTING_KEYS.filter((key) => JSON.stringify(previous[key]) !== JSON.stringify(next[key]));
}

/**
 * Tells whether a change touches the protected bank data.
 *
 * @param changed - The changed keys.
 * @returns `true` when the bank data changed.
 */
export function bankDataChanged(changed: readonly SettingKey[]): boolean {
  return changed.includes('bank');
}
