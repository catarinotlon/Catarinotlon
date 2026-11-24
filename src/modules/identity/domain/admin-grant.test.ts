import { describe, expect, it } from 'vitest';

import { createAdminGrant } from './admin-grant';

const at = new Date('2026-11-24T18:00:00.000Z');

describe('createAdminGrant', () => {
  it('records who granted access to which address, normalized', () => {
    expect(
      createAdminGrant({
        id: 'g1',
        email: ' Helper@Example.TEST ',
        grantedBy: 'owner-1',
        grantedAt: at,
      }),
    ).toEqual({
      ok: true,
      value: { id: 'g1', email: 'helper@example.test', grantedBy: 'owner-1', grantedAt: at },
    });
  });

  it.each(['', 'helper', 'helper@', '@example.test', 'helper @example.test'])(
    'refuses %j as an address',
    (email) => {
      expect(createAdminGrant({ id: 'g1', email, grantedBy: 'owner-1', grantedAt: at })).toEqual({
        ok: false,
        error: { code: 'identity.invalid_email' },
      });
    },
  );
});
