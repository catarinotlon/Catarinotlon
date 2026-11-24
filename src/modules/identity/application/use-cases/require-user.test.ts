import { describe, expect, it } from 'vitest';

import type { CurrentUser } from '../ports/current-user-provider';
import { requireAdmin, requireUser } from './require-user';

const runner: CurrentUser = {
  id: 'user-1',
  name: 'Runner',
  email: 'runner@example.test',
  emailVerified: true,
};
const admin: CurrentUser = { ...runner, id: 'admin-1', email: 'admin@example.test' };

const provider = (user: CurrentUser | null) => ({ current: async () => user });
const adminEmails = ['admin@example.test'];

describe('requireUser', () => {
  it('returns the signed-in user', async () => {
    expect(await requireUser({ currentUser: provider(runner) })).toEqual({
      ok: true,
      value: runner,
    });
  });

  it('fails for a signed-out visitor', async () => {
    expect(await requireUser({ currentUser: provider(null) })).toEqual({
      ok: false,
      error: { code: 'identity.not_signed_in' },
    });
  });
});

describe('requireAdmin', () => {
  it('returns a user on the allowlist', async () => {
    const result = await requireAdmin({ currentUser: provider(admin), adminEmails });

    expect(result).toEqual({ ok: true, value: admin });
  });

  it('refuses a runner', async () => {
    const result = await requireAdmin({ currentUser: provider(runner), adminEmails });

    expect(result).toEqual({ ok: false, error: { code: 'identity.not_admin' } });
  });

  it('refuses an allowlisted address that is not verified', async () => {
    const result = await requireAdmin({
      currentUser: provider({ ...admin, emailVerified: false }),
      adminEmails,
    });

    expect(result).toEqual({ ok: false, error: { code: 'identity.not_admin' } });
  });

  it('refuses a signed-out visitor as not admin, revealing nothing', async () => {
    const result = await requireAdmin({ currentUser: provider(null), adminEmails });

    expect(result).toEqual({ ok: false, error: { code: 'identity.not_admin' } });
  });

  it('revokes access on the next request once the address leaves the list', async () => {
    const deps = { currentUser: provider(admin), adminEmails: ['admin@example.test'] };
    expect((await requireAdmin(deps)).ok).toBe(true);

    expect((await requireAdmin({ ...deps, adminEmails: [] })).ok).toBe(false);
  });
});
