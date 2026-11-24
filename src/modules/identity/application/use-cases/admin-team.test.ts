import { beforeEach, describe, expect, it } from 'vitest';

import { InMemoryEmailSender } from '@/shared/domain/email';

import type { CurrentUser } from '../ports/current-user-provider';
import { InMemoryAdminGrantRepository } from '../../infrastructure/in-memory-admin-grant-repository';
import { adminEmailList, grantAdmin, requireOwner, revokeAdmin } from './admin-team';

const OWNERS = ['owner@example.test'];
const NOW = new Date('2026-11-24T18:00:00.000Z');

const user = (email: string, emailVerified = true): CurrentUser =>
  ({ id: `id-${email}`, name: 'Someone', email, emailVerified }) as CurrentUser;

describe('admin team', () => {
  let grants: InMemoryAdminGrantRepository;
  let emails: InMemoryEmailSender;
  let reported: unknown[];
  let nextId: number;
  const deps = () => ({
    grants,
    owners: OWNERS,
    ids: { uuid: () => `grant-${(nextId += 1)}` },
    clock: { now: () => NOW },
    emails,
    reporter: { report: (error: unknown) => void reported.push(error) },
    links: { signIn: (locale: string) => `https://app.test/${locale}/sign-in` },
  });
  const grant = (email: string) => grantAdmin(deps(), { ownerId: 'o', ownerName: 'Owner', email });

  beforeEach(() => {
    grants = new InMemoryAdminGrantRepository();
    emails = new InMemoryEmailSender();
    reported = [];
    nextId = 0;
  });

  describe('requireOwner', () => {
    const owner = (current: CurrentUser | null) =>
      requireOwner({ currentUser: { current: async () => current }, owners: OWNERS });

    it('accepts the owner with a verified address', async () => {
      expect((await owner(user('owner@example.test'))).ok).toBe(true);
    });

    it('refuses an added admin', async () => {
      await grant('helper@example.test');

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
      await grant('helper@example.test');

      expect(await adminEmailList(deps())).toEqual(['owner@example.test', 'helper@example.test']);
    });
  });

  describe('grantAdmin', () => {
    it('adds an admin by address, recording who did it and when', async () => {
      const result = await grantAdmin(deps(), {
        ownerId: 'owner-1',
        ownerName: 'Owner',
        email: 'Helper@Example.test',
      });

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

    it('tells the new admin, in Spanish, who added them and where to sign in', async () => {
      await grant('Helper@Example.test');

      expect(emails.sent).toEqual([
        {
          template: 'admin_granted',
          to: 'helper@example.test',
          locale: 'es',
          idempotencyKey: 'admin_granted:grant-1',
          data: { grantedBy: 'Owner', signInUrl: 'https://app.test/es/sign-in' },
        },
      ]);
    });

    it('keeps the grant when the email cannot be sent', async () => {
      emails.send = async () => {
        throw new Error('provider down');
      };

      expect((await grant('helper@example.test')).ok).toBe(true);
      expect(await adminEmailList(deps())).toContain('helper@example.test');
      expect(reported).toHaveLength(1);
    });

    it('sends nothing when the grant is refused', async () => {
      await grant('helper@example.test');
      await grant('owner@example.test');
      await grant('nope');

      expect(emails.sent.map((sent) => sent.to)).toEqual(['helper@example.test']);
    });

    it('refuses an invalid address', async () => {
      expect(await grant('nope')).toEqual({
        ok: false,
        error: { code: 'identity.invalid_email' },
      });
    });

    it.each(['owner@example.test', 'HELPER@example.test'])(
      'refuses %s, who is already an admin',
      async (email) => {
        await grant('helper@example.test');

        expect(await grant(email)).toEqual({
          ok: false,
          error: { code: 'identity.already_admin' },
        });
      },
    );
  });

  describe('revokeAdmin', () => {
    it('removes an added admin', async () => {
      await grant('helper@example.test');

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
