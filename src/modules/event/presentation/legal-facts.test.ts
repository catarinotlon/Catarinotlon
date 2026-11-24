import { describe, expect, it } from 'vitest';

import { EMPTY_SETTINGS, type EventSettingsValues } from '../domain/event-settings';
import { toLegalFacts } from './legal-facts';

const settings: EventSettingsValues = {
  ...EMPTY_SETTINGS,
  eventDate: '2030-01-15',
  venue: { es: 'Deportivo', en: 'Sports center' },
  kitPickup: { es: 'Sábado en la sede', en: 'Saturday at the venue' },
  feeCents: 25000,
  shirtSizeDeadline: '2030-01-01T06:00:00.000Z',
  contact: {
    fullName: 'Admin',
    phone: '5500000000',
    email: 'contact@example.test',
    whatsapp: '525500000000',
    hours: { es: 'De 9 a 18', en: '9 to 6' },
  },
};

describe('toLegalFacts', () => {
  it('takes the event facts the terms mention from the settings, in the visitor’s language', () => {
    expect(toLegalFacts(settings, 'en')).toEqual({
      eventDate: '2030-01-15',
      venue: 'Sports center',
      feeCents: 25000,
      sizeDeadline: '2030-01-01T06:00:00.000Z',
      kitPickup: 'Saturday at the venue',
      contactEmail: 'contact@example.test',
    });
  });

  it('leaves a fact empty while the organizer has not set it', () => {
    expect(toLegalFacts(EMPTY_SETTINGS, 'es')).toEqual({
      eventDate: null,
      venue: null,
      feeCents: null,
      sizeDeadline: null,
      kitPickup: null,
      contactEmail: null,
    });
  });
});
