import type { EventSettingsValues, LocalizedText } from '../domain/event-settings';

const MEXICO_CITY_OFFSET = '-06:00';
const UNREADABLE_FEE = -1;

const text = (data: FormData, name: string): string => String(data.get(name) ?? '').trim();
const optional = (data: FormData, name: string): string | null => text(data, name) || null;

function localized(data: FormData, es: string, en: string): LocalizedText | null {
  const value = { es: text(data, es), en: text(data, en) };
  return value.es || value.en ? value : null;
}

function parseFeeCents(raw: string): number | null {
  if (!raw) return null;
  const normalized = raw.replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return UNREADABLE_FEE;
  return Math.round(Number(normalized) * 100);
}

function endOfDay(date: string): string | null {
  return date ? new Date(`${date}T23:59:59${MEXICO_CITY_OFFSET}`).toISOString() : null;
}

/**
 * Applies one submitted section of the settings form to the current values.
 *
 * @remarks
 * Blank fields become missing settings. An unreadable price becomes a negative
 * value, so the domain's validation rejects it with its usual error.
 *
 * @param current - The current settings.
 * @param data - The submitted section.
 * @returns The complete new settings.
 */
export function applySettingsSection(
  current: EventSettingsValues,
  data: FormData,
): EventSettingsValues {
  switch (data.get('section')) {
    case 'event':
      return {
        ...current,
        eventDate: optional(data, 'eventDate'),
        startTimes: { '3K': optional(data, 'start3k'), '5K': optional(data, 'start5k') },
        venue: localized(data, 'venueEs', 'venueEn'),
        kitPickup: localized(data, 'kitEs', 'kitEn'),
        routeMapUrl: optional(data, 'routeMapUrl'),
      };
    case 'registration':
      return {
        ...current,
        feeCents: parseFeeCents(text(data, 'fee')),
        shirtSizes: text(data, 'shirtSizes')
          .split(',')
          .map((size) => size.trim())
          .filter(Boolean),
        shirtSizeDeadline: endOfDay(text(data, 'shirtSizeDeadline')),
      };
    case 'contact': {
      const contact = {
        fullName: text(data, 'fullName'),
        email: text(data, 'email'),
        phone: text(data, 'phone'),
        whatsapp: text(data, 'whatsapp'),
        hours: { es: text(data, 'hoursEs'), en: text(data, 'hoursEn') },
      };
      const empty =
        !contact.fullName &&
        !contact.email &&
        !contact.phone &&
        !contact.whatsapp &&
        !contact.hours.es &&
        !contact.hours.en;
      return { ...current, contact: empty ? null : contact };
    }
    case 'bank': {
      const bank = {
        beneficiary: text(data, 'beneficiary'),
        bank: text(data, 'bank'),
        clabe: text(data, 'clabe').replace(/\s/g, ''),
      };
      const empty = !bank.beneficiary && !bank.bank && !bank.clabe;
      return { ...current, bank: empty ? null : bank };
    }
    default:
      return current;
  }
}
