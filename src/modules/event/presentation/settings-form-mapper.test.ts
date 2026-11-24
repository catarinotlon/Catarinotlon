import { describe, expect, it } from 'vitest';

import { EMPTY_SETTINGS, type EventSettingsValues } from '../domain/event-settings';
import { applySettingsSection } from './settings-form-mapper';

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

const current: EventSettingsValues = {
  ...EMPTY_SETTINGS,
  feeCents: 10000,
  venue: { es: 'Sede', en: 'Venue' },
};

describe('applySettingsSection', () => {
  describe('event', () => {
    it('updates the event fields and leaves other sections alone', () => {
      const result = applySettingsSection(
        current,
        form({
          section: 'event',
          eventDate: '2030-01-15',
          start3k: '07:00',
          start5k: '07:30',
          venueEs: ' Nueva ',
          venueEn: 'New',
          kitEs: 'Entrega',
          kitEn: 'Pickup',
          routeMapUrl: 'https://example.test/route',
        }),
      );

      expect(result).toMatchObject({
        eventDate: '2030-01-15',
        startTimes: { '3K': '07:00', '5K': '07:30' },
        venue: { es: 'Nueva', en: 'New' },
        kitPickup: { es: 'Entrega', en: 'Pickup' },
        routeMapUrl: 'https://example.test/route',
        feeCents: 10000,
      });
    });

    it('stores blank fields as missing', () => {
      const result = applySettingsSection(
        current,
        form({
          section: 'event',
          eventDate: '',
          start3k: '',
          start5k: '',
          venueEs: '',
          venueEn: '',
        }),
      );

      expect(result).toMatchObject({
        eventDate: null,
        startTimes: { '3K': null, '5K': null },
        venue: null,
        routeMapUrl: null,
      });
    });

    it('keeps a venue written in only one language, so it is listed as missing', () => {
      const result = applySettingsSection(
        current,
        form({ section: 'event', venueEs: 'Sede', venueEn: '' }),
      );

      expect(result.venue).toEqual({ es: 'Sede', en: '' });
    });
  });

  describe('registration', () => {
    it.each([
      ['350', 35000],
      ['350.50', 35050],
      ['1,250.00', 125000],
      ['19.99', 1999],
    ])('converts the price %s to %d cents', (fee, cents) => {
      const result = applySettingsSection(current, form({ section: 'registration', fee }));

      expect(result.feeCents).toBe(cents);
    });

    it('stores a blank price as missing', () => {
      const result = applySettingsSection(current, form({ section: 'registration', fee: ' ' }));

      expect(result.feeCents).toBeNull();
    });

    it('turns an unreadable price into an invalid value the domain rejects', () => {
      const result = applySettingsSection(current, form({ section: 'registration', fee: 'abc' }));

      expect(result.feeCents).toBe(-1);
    });

    it('splits the sizes in order', () => {
      const result = applySettingsSection(
        current,
        form({ section: 'registration', fee: '100', shirtSizes: ' Size B, Size A ,' }),
      );

      expect(result.shirtSizes).toEqual(['Size B', 'Size A']);
    });

    it('sets the deadline to the end of that day in Mexico City', () => {
      const result = applySettingsSection(
        current,
        form({ section: 'registration', fee: '100', shirtSizeDeadline: '2030-01-15' }),
      );

      expect(result.shirtSizeDeadline).toBe('2030-01-16T05:59:59.000Z');
    });
  });

  describe('contact', () => {
    it('stores the contact card', () => {
      const result = applySettingsSection(
        current,
        form({
          section: 'contact',
          fullName: 'Name',
          email: 'a@example.test',
          phone: '1',
          whatsapp: '2',
          hoursEs: 'Horario',
          hoursEn: 'Hours',
        }),
      );

      expect(result.contact).toEqual({
        fullName: 'Name',
        email: 'a@example.test',
        phone: '1',
        whatsapp: '2',
        hours: { es: 'Horario', en: 'Hours' },
      });
    });

    it('stores an empty card as missing', () => {
      const result = applySettingsSection(current, form({ section: 'contact', fullName: ' ' }));

      expect(result.contact).toBeNull();
    });
  });

  describe('bank', () => {
    it('stores the bank data, without spaces in the CLABE', () => {
      const result = applySettingsSection(
        current,
        form({
          section: 'bank',
          beneficiary: ' Name ',
          bank: 'Bank',
          clabe: '0020 1007 7777 7777 71',
        }),
      );

      expect(result.bank).toEqual({
        beneficiary: 'Name',
        bank: 'Bank',
        clabe: '002010077777777771',
      });
    });

    it('stores empty bank data as missing', () => {
      const result = applySettingsSection(
        current,
        form({ section: 'bank', beneficiary: '', bank: '', clabe: '' }),
      );

      expect(result.bank).toBeNull();
    });
  });

  it('changes nothing for an unknown section', () => {
    expect(applySettingsSection(current, form({ section: 'other' }))).toEqual(current);
  });
});
