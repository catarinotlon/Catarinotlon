import { describe, expect, it } from 'vitest';

import {
  bankDataChanged,
  changedFields,
  EMPTY_SETTINGS,
  isPaymentOpen,
  missingSettings,
  validateSettings,
  type EventSettingsValues,
} from './event-settings';

const VALID_CLABE = '002010077777777771';

const complete: EventSettingsValues = {
  eventDate: '2026-06-01',
  startTimes: { '3K': '07:00', '5K': '07:30' },
  venue: { es: 'Lugar', en: 'Place' },
  kitPickup: { es: 'Entrega', en: 'Pickup' },
  routeMapUrl: 'https://example.test/route',
  feeCents: 10000,
  shirtSizes: ['size-a', 'size-b'],
  shirtSizeDeadline: '2026-05-01T23:59:59.000Z',
  contact: {
    fullName: 'Contact Person',
    phone: '5500000000',
    email: 'contact@example.test',
    whatsapp: '525500000000',
    hours: { es: 'Horario', en: 'Hours' },
  },
  bank: { beneficiary: 'Contact Person', bank: 'Bank', clabe: VALID_CLABE },
};

describe('missingSettings', () => {
  it('lists everything on empty settings', () => {
    expect(missingSettings(EMPTY_SETTINGS)).toEqual([
      'eventDate',
      'startTimes',
      'venue',
      'kitPickup',
      'routeMapUrl',
      'feeCents',
      'shirtSizes',
      'shirtSizeDeadline',
      'contact',
      'bank',
    ]);
  });

  it('is empty when everything is set', () => {
    expect(missingSettings(complete)).toEqual([]);
  });

  it('treats a venue missing one locale as missing', () => {
    expect(missingSettings({ ...complete, venue: { es: 'Lugar', en: '' } })).toEqual(['venue']);
  });

  it('treats a distance with no start time as missing', () => {
    expect(missingSettings({ ...complete, startTimes: { '3K': '07:00', '5K': null } })).toEqual([
      'startTimes',
    ]);
  });
});

describe('isPaymentOpen', () => {
  it('is closed on empty settings', () => {
    expect(isPaymentOpen(EMPTY_SETTINGS)).toBe(false);
  });

  it('is closed without the fee', () => {
    expect(isPaymentOpen({ ...complete, feeCents: null })).toBe(false);
  });

  it('is closed without the bank data', () => {
    expect(isPaymentOpen({ ...complete, bank: null })).toBe(false);
  });

  it('is open with the fee and the bank data, even if other settings are missing', () => {
    expect(
      isPaymentOpen({ ...EMPTY_SETTINGS, feeCents: complete.feeCents, bank: complete.bank }),
    ).toBe(true);
  });
});

describe('validateSettings', () => {
  it('accepts complete settings', () => {
    expect(validateSettings(complete)).toEqual({ ok: true, value: complete });
  });

  it('accepts empty settings, because anything may still be pending', () => {
    expect(validateSettings(EMPTY_SETTINGS).ok).toBe(true);
  });

  it.each([0, -100, 10.5])('rejects the fee %d', (feeCents) => {
    expect(validateSettings({ ...complete, feeCents })).toEqual({
      ok: false,
      error: { code: 'event.invalid_fee' },
    });
  });

  it('rejects a CLABE with a wrong check digit', () => {
    const bank = { beneficiary: 'Name', bank: 'Bank', clabe: '002010077777777772' };

    expect(validateSettings({ ...complete, bank })).toEqual({
      ok: false,
      error: { code: 'payments.invalid_clabe' },
    });
  });

  it('rejects bank data with a blank beneficiary', () => {
    const bank = { beneficiary: '  ', bank: 'Bank', clabe: VALID_CLABE };

    expect(validateSettings({ ...complete, bank })).toEqual({
      ok: false,
      error: { code: 'event.incomplete_bank_data' },
    });
  });

  it('rejects duplicated shirt sizes', () => {
    expect(validateSettings({ ...complete, shirtSizes: ['size-a', 'size-a'] })).toEqual({
      ok: false,
      error: { code: 'event.invalid_shirt_sizes' },
    });
  });
});

describe('changedFields', () => {
  it('is empty for identical settings', () => {
    expect(changedFields(complete, { ...complete })).toEqual([]);
  });

  it('names each top-level field that changed', () => {
    expect(
      changedFields(complete, {
        ...complete,
        feeCents: 20000,
        venue: { es: 'Otro', en: 'Place' },
      }),
    ).toEqual(['venue', 'feeCents']);
  });
});

describe('bankDataChanged', () => {
  it('is true when the bank data changed', () => {
    expect(bankDataChanged(['feeCents', 'bank'])).toBe(true);
  });

  it('is false otherwise', () => {
    expect(bankDataChanged(['feeCents', 'venue'])).toBe(false);
  });
});
