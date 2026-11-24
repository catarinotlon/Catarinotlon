import { beforeEach, describe, expect, it } from 'vitest';

import type { CurrentUser } from '../ports/current-user-provider';
import { InMemoryAdminGrantRepository } from '../../infrastructure/in-memory-admin-grant-repository';
import { adminEmailList, grantAdmin, requireOwner, revokeAdmin } from './admin-team';

const OWNERS = ['owner@example.test'];
const NOW = new Date('2026-11-24T18:00:00.000Z');

const user = (email: string, emailVerified = true): CurrentUser =>
  ({ id: `id-${email}`, name: 'Someone', email, emailVerified }) as CurrentUser;

describe('admin team', () => {
  let grants: InMemoryAdminGrantRepository;
  let nextId: number;
  const deps = () => ({
    grants,
    owners: OWNERS,
    ids: { uuid: () => `grant-${(nextId += 1)}` },
    clock: { now: () => NOW },
  });

  beforeEach(() => {
    grants = new InMemoryAdminGrantRepository();
    nextId = 0;
  });

  describe('requireOwner', () => {
    const owner = (current: CurrentUser | null) =>
      requireOwner({ currentUser: { current: async () => current }, owners: OWNERS });

    it('accepts the owner with a verified address', async () => {
      expect((await owner(user('owner@example.test'))).ok).toBe(true);
    });

    it('refuses an added admin', async () => {
      await grantAdmin(deps(), { ownerId: 'o', email: 'helper@example.test' });

      expect(await owner(user('helper@example.test'))).toEqual({
        ok: false,
        error: { code: 'identity.not_owner' },
      });
    });

    it('refuses the owner’s address while it is not verified', async () => {
      expect((await owner(user('owner@example.test', false))).ok).toBe(false);
    });

    it('refuses a visitor who is not signed in', async () => {
      expect((await owner(null)).ok).toBe(false);
    });
  });

  describe('adminEmailList', () => {
    it('joins the owners and the added admins', async () => {
      await grantAdmin(deps(), { ownerId: 'o', email: 'helper@example.test' });

      expect(await adminEmailList(deps())).toEqual(['owner@example.test', 'helper@example.test']);
    });
  });

  describe('grantAdmin', () => {
    it('adds an admin by address, recording who did it and when', async () => {
      const result = await grantAdmin(deps(), { ownerId: 'owner-1', email: 'Helper@Example.test' });

      expect(result).toEqual({
        ok: true,
        value: {
          id: 'grant-1',
          email: 'helper@example.test',
          grantedBy: 'owner-1',
          grantedAt: NOW,
        },
      });
    });

    it('refuses an invalid address', async () => {
      expect(await grantAdmin(deps(), { ownerId: 'o', email: 'nope' })).toEqual({
        ok: false,
        error: { code: 'identity.invalid_email' },
      });
    });

    it.each(['owner@example.test', 'HELPER@example.test'])(
      'refuses %s, who is already an admin',
      async (email) => {
        await grantAdmin(deps(), { ownerId: 'o', email: 'helper@example.test' });

        expect(await grantAdmin(deps(), { ownerId: 'o', email })).toEqual({
          ok: false,
          error: { code: 'identity.already_admin' },
        });
      },
    );
  });

  describe('revokeAdmin', () => {
    it('removes an added admin', async () => {
      await grantAdmin(deps(), { ownerId: 'o', email: 'helper@example.test' });

      expect(await revokeAdmin(deps(), { ownerId: 'o', grantId: 'grant-1' })).toEqual({
        ok: true,
        value: undefined,
      });
      expect(await adminEmailList(deps())).toEqual(['owner@example.test']);
    });

    it('reports an admin that does not exist', async () => {
      expect(await revokeAdmin(deps(), { ownerId: 'o', grantId: 'missing' })).toEqual({
        ok: false,
        error: { code: 'identity.admin_not_found' },
      });
    });
  });
});
