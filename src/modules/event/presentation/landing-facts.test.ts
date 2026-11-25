import { describe, expect, it } from 'vitest';

import { EMPTY_SETTINGS, type EventSettingsValues } from '../domain/event-settings';
import { toLandingFacts } from './landing-facts';

const complete: EventSettingsValues = {
  ...EMPTY_SETTINGS,
  eventDate: '2026-06-01',
  startTimes: { '3K': '07:00', '5K': '07:30' },
  venue: { es: 'Sede', en: 'Venue' },
  kitPickup: { es: 'Entrega', en: 'Pickup' },
  routeMapUrl: 'https://example.test/route',
  feeCents: 12345,
  shirtSizes: ['size-a', 'size-b'],
  bank: { beneficiary: 'Name', bank: 'Bank', clabe: '002010077777777771' },
};

describe('toLandingFacts', () => {
  it('reports every fact as missing on empty settings', () => {
    expect(toLandingFacts(EMPTY_SETTINGS, 'es')).toEqual({
      eventDate: null,
      startThree: null,
      startFive: null,
      venue: null,
      kitPickup: null,
      routeMapUrl: null,
      venueMapUrl: null,
      feeAmount: null,
      shirtSizes: [],
      paymentOpen: false,
    });
  });

  it('picks the free text of the requested locale', () => {
    expect(toLandingFacts(complete, 'en')).toMatchObject({ venue: 'Venue', kitPickup: 'Pickup' });
    expect(toLandingFacts(complete, 'es')).toMatchObject({ venue: 'Sede', kitPickup: 'Entrega' });
  });

  it('links the venue to a Google Maps search by its Spanish name in every locale', () => {
    const settings = { ...complete, venue: { es: 'Parque Hundido, CDMX', en: 'Sunken Park' } };
    const expected = 'https://www.google.com/maps/search/?api=1&query=Parque%20Hundido%2C%20CDMX';
    expect(toLandingFacts(settings, 'es').venueMapUrl).toBe(expected);
    expect(toLandingFacts(settings, 'en').venueMapUrl).toBe(expected);
  });

  it('converts the fee from cents to a currency amount', () => {
    expect(toLandingFacts(complete, 'es').feeAmount).toBe(123.45);
  });

  it('reports payment as open once the fee and bank data exist', () => {
    expect(toLandingFacts(complete, 'es').paymentOpen).toBe(true);
  });

  it('never exposes the bank data', () => {
    expect(JSON.stringify(toLandingFacts(complete, 'es'))).not.toContain('002010077777777771');
  });
});
