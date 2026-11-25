import {
  isPaymentOpen,
  type EventSettingsValues,
  type LocalizedText,
} from '../domain/event-settings';

/** The public event facts shown on the landing page. Each may still be missing. */
export interface LandingFacts {
  /** The race date, as `YYYY-MM-DD`. */
  readonly eventDate: string | null;
  /** The 3K start time. */
  readonly startThree: string | null;
  /** The 5K start time. */
  readonly startFive: string | null;
  /** The venue, in the page's locale. */
  readonly venue: string | null;
  /** Kit pickup information, in the page's locale. */
  readonly kitPickup: string | null;
  /** Link to the route map. */
  readonly routeMapUrl: string | null;
  /** Link that opens the venue on Google Maps, built from its Spanish name. */
  readonly venueMapUrl: string | null;
  /** The registration fee as a currency amount. */
  readonly feeAmount: number | null;
  /** The shirt sizes on offer. */
  readonly shirtSizes: readonly string[];
  /** Whether payment is open. */
  readonly paymentOpen: boolean;
}

const GOOGLE_MAPS_SEARCH = 'https://www.google.com/maps/search/?api=1&query=';

const localized = (text: LocalizedText | null, locale: string): string | null =>
  (locale === 'en' ? text?.en : text?.es) || null;

/**
 * Maps the event settings to what the public landing page may show.
 *
 * @remarks
 * The bank and contact data are left out, because they are never rendered for
 * signed-out visitors. The venue map searches Google Maps for the venue's Spanish
 * name in every locale, because the place is known by that name; it needs no
 * setting of its own.
 *
 * @param values - The current event settings.
 * @param locale - The page's locale.
 * @returns The public facts.
 */
export function toLandingFacts(values: EventSettingsValues, locale: string): LandingFacts {
  return {
    eventDate: values.eventDate,
    startThree: values.startTimes['3K'],
    startFive: values.startTimes['5K'],
    venue: localized(values.venue, locale),
    kitPickup: localized(values.kitPickup, locale),
    routeMapUrl: values.routeMapUrl,
    venueMapUrl: values.venue?.es
      ? `${GOOGLE_MAPS_SEARCH}${encodeURIComponent(values.venue.es)}`
      : null,
    feeAmount: values.feeCents === null ? null : values.feeCents / 100,
    shirtSizes: values.shirtSizes,
    paymentOpen: isPaymentOpen(values),
  };
}
