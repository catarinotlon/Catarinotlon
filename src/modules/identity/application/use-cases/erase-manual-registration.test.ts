import { describe, expect, it } from 'vitest';

import type { RegistrationErasureRequest } from '../ports/personal-data-eraser';
import { eraseManualRegistration } from './erase-manual-registration';

const NOW = new Date('2026-06-01T12:00:00.000Z');

const deps = (erased: boolean, requests: RegistrationErasureRequest[] = []) => ({
  eraser: {
    eraseManual: async (request: RegistrationErasureRequest) => {
      requests.push(request);
      return erased;
    },
  },
  clock: { now: () => NOW },
  ids: { uuid: () => 'record-1' },
});

describe('eraseManualRegistration', () => {
  it('erases the registration and records who ran it and when', async () => {
    const requests: RegistrationErasureRequest[] = [];

    const result = await eraseManualRegistration(deps(true, requests), {
      adminId: 'admin-1',
      registrationId: 'walk-in',
    });

    expect(result.ok).toBe(true);
    expect(requests).toEqual([
      { recordId: 'record-1', registrationId: 'walk-in', performedBy: 'admin-1', at: NOW },
    ]);
  });

  it('reports a registration that cannot be erased this way', async () => {
    const result = await eraseManualRegistration(deps(false), {
      adminId: 'admin-1',
      registrationId: 'has-account',
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'identity.registration_not_erasable' },
    });
  });
});
