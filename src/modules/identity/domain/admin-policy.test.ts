import { describe, expect, it } from 'vitest';

import { isAdmin, parseAdminEmails } from './admin-policy';

describe('parseAdminEmails', () => {
  it('splits a comma-separated list and normalizes each address', () => {
    expect(parseAdminEmails(' A@Example.test, b@example.test ,')).toEqual([
      'a@example.test',
      'b@example.test',
    ]);
  });

  it('is empty for an empty value', () => {
    expect(parseAdminEmails('')).toEqual([]);
  });
});

describe('isAdmin', () => {
  const allowlist = ['admin@example.test'];

  it('accepts a verified address on the list', () => {
    expect(isAdmin({ email: 'admin@example.test', emailVerified: true }, allowlist)).toBe(true);
  });

  it('ignores the casing of the address', () => {
    expect(isAdmin({ email: 'Admin@Example.TEST', emailVerified: true }, allowlist)).toBe(true);
  });

  it('refuses an address on the list that is not verified', () => {
    expect(isAdmin({ email: 'admin@example.test', emailVerified: false }, allowlist)).toBe(false);
  });

  it('refuses a verified address that is not on the list', () => {
    expect(isAdmin({ email: 'runner@example.test', emailVerified: true }, allowlist)).toBe(false);
  });

  it('refuses everyone when the list is empty', () => {
    expect(isAdmin({ email: 'admin@example.test', emailVerified: true }, [])).toBe(false);
  });
});
