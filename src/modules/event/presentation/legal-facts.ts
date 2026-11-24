import type { EventSettingsValues, LocalizedText } from '../domain/event-settings';

/** The event facts the terms mention, as the organizer set them. */
export interface LegalFacts {
  /** The race day, `YYYY-MM-DD`. */
  readonly eventDate: string | null;
  /** The venue, in the visitor's language. */
  readonly venue: string | null;
  /** The registration fee, in cents. */
  readonly feeCents: number | null;
  /** The last moment to change the shirt size, as an ISO timestamp. */
  readonly sizeDeadline: string | null;
  /** When and where kits are handed out, in the visitor's language. */
  readonly kitPickup: string | null;
  /** The organizer's contact email. */
  readonly contactEmail: string | null;
}

const localized = (text: LocalizedText | null, locale: string): string | null =>
  (locale === 'en' ? text?.en : text?.es) || null;

/**
 * Picks the event facts the terms mention from the event settings.
 *
 * @remarks
 * A fact the organizer has not set yet stays `null`, and the terms keep its
 * bracketed gap.
 *
 * @param values - The current event settings.
 * @param locale - The visitor's language.
 * @returns The facts for the terms.
 * @example
 * toLegalFacts(settings, 'es').venue; // 'Deportivo'
 */
export function toLegalFacts(values: EventSettingsValues, locale: string): LegalFacts {
  return {
    eventDate: values.eventDate,
    venue: localized(values.venue, locale),
    feeCents: values.feeCents,
    sizeDeadline: values.shirtSizeDeadline,
    kitPickup: localized(values.kitPickup, locale),
    contactEmail: values.contact?.email.trim() || null,
  };
}
