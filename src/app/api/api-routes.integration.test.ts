import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { localReceiptStore } from '@/composition';
import { signInAction, signUpAction } from '@/modules/identity/presentation/auth-actions';
import { confirmPaymentAction } from '@/modules/payments/presentation/admin-actions';
import { recordReceiptAction } from '@/modules/payments/presentation/payment-actions';
import {
  form,
  migrateActionDatabase,
  OPEN_SETTINGS,
  redirectOf,
  resetRequest,
  setSettings,
  sql,
} from '@/test/action-harness';

import { GET as exportCsv } from './admin/exports/[kind]/route';
import { GET as cron } from './cron/race-reminders/route';
import { GET as readReceipt } from './receipts/[paymentId]/route';
import { POST as uploadLocal } from './receipts/local/route';
import { GET as ticketPdf } from './tickets/[id]/pdf/route';

const PASSWORD = 'correct-horse-battery';
const ADMIN_EMAIL = 'admin@actions.test';
const CRON_SECRET = 'cron-test-secret-value';
let counter = 0;

const url = (path: string) => `http://localhost:3000${path}`;
const context = <T>(params: T) => ({ params: Promise.resolve(params) });

async function createAccount(email: string) {
  resetRequest();
  await redirectOf(() =>
    signUpAction(
      {},
      form({
        name: 'Route Test',
        email,
        password: PASSWORD,
        phone: '5500000000',
        acceptLegal: 'on',
        distance: '5K',
        shirtSize: 'TEST-M',
        shirtName: 'Route',
      }),
    ),
  );
  await sql('UPDATE user SET email_verified = 1 WHERE email = ?', [email]);
}

async function signIn(email: string) {
  resetRequest();
  await redirectOf(() => signInAction({}, form({ email, password: PASSWORD })));
}

async function runner() {
  const email = `route-${++counter}@actions.test`;
  await createAccount(email);
  await signIn(email);
  const [row] = await sql('SELECT id FROM user WHERE email = ?', [email]);
  return { email, userId: String(row?.id) };
}

async function paidRunner() {
  const account = await runner();
  const pathname = `receipts/${account.userId}/receipt.pdf`;
  await localReceiptStore()?.write(pathname, 'application/pdf', new TextEncoder().encode('%PDF'));
  await redirectOf(() => recordReceiptAction({ pathname }));
  const [payment] = await sql('SELECT id FROM payments WHERE owner_id = ?', [account.userId]);
  return { ...account, pathname, paymentId: String(payment?.id) };
}

async function ticketOf(paymentId: string, userId: string) {
  await signIn(ADMIN_EMAIL);
  await confirmPaymentAction({}, form({ paymentId }));
  const [ticket] = await sql(
    `SELECT t.id FROM tickets t JOIN registrations r ON r.id = t.registration_id
     WHERE r.owner_id = ?`,
    [userId],
  );
  return String(ticket?.id);
}

const upload = (pathname: string, file: File) => {
  const body = new FormData();
  body.set('file', file);
  body.set('pathname', pathname);
  return uploadLocal(new Request(url('/api/receipts/local'), { method: 'POST', body }));
};

describe('API routes', () => {
  beforeAll(async () => {
    await migrateActionDatabase();
    await setSettings(OPEN_SETTINGS);
    await createAccount(ADMIN_EMAIL);
  });

  beforeEach(() => {
    resetRequest();
  });

  describe('GET /api/receipts/[paymentId]', () => {
    const read = (paymentId: string, query = '') =>
      readReceipt(new Request(url(`/api/receipts/${paymentId}${query}`)), context({ paymentId }));

    it('serves the receipt to its owner, privately', async () => {
      const { email, paymentId } = await paidRunner();
      await signIn(email);

      const response = await read(paymentId);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/pdf');
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('content-security-policy')).toContain('sandbox');
      expect(await response.text()).toBe('%PDF');
    });

    it('serves it to an admin', async () => {
      const { paymentId } = await paidRunner();
      await signIn(ADMIN_EMAIL);

      expect((await read(paymentId)).status).toBe(200);
    });

    it('hides it from another runner', async () => {
      const { paymentId } = await paidRunner();
      await runner();

      expect((await read(paymentId)).status).toBe(404);
    });

    it('hides it from a signed-out visitor', async () => {
      const { paymentId } = await paidRunner();
      resetRequest();

      expect((await read(paymentId)).status).toBe(404);
    });

    it('refuses a file that does not belong to the payment', async () => {
      const victim = await paidRunner();
      const { email, paymentId } = await paidRunner();
      await signIn(email);

      const response = await read(paymentId, `?file=${encodeURIComponent(victim.pathname)}`);

      expect(response.status).toBe(404);
    });

    it('answers 404 for an unknown payment', async () => {
      await runner();

      expect((await read('missing')).status).toBe(404);
    });
  });

  describe('POST /api/receipts/local', () => {
    const pdf = (size = 10) =>
      new File([new Uint8Array(size)], 'r.pdf', { type: 'application/pdf' });

    it('refuses a signed-out visitor', async () => {
      expect((await upload('receipts/x/y.pdf', pdf())).status).toBe(401);
    });

    it('stores a valid file in the user’s folder', async () => {
      const { userId } = await runner();
      const pathname = `receipts/${userId}/stored.pdf`;

      expect((await upload(pathname, pdf())).status).toBe(204);

      expect(await localReceiptStore()?.stat(pathname)).toMatchObject({
        contentType: 'application/pdf',
        sizeBytes: 10,
      });
    });

    it('refuses another user’s folder', async () => {
      const victim = await runner();
      await runner();

      expect((await upload(`receipts/${victim.userId}/x.pdf`, pdf())).status).toBe(400);
    });

    it('refuses a forbidden type', async () => {
      const { userId } = await runner();
      const html = new File(['<script>'], 'x.html', { type: 'text/html' });

      expect((await upload(`receipts/${userId}/x.html`, html)).status).toBe(400);
    });

    it('refuses a file over the limit', async () => {
      const { userId } = await runner();

      expect((await upload(`receipts/${userId}/big.pdf`, pdf(1001))).status).toBe(400);
    });
  });

  describe('GET /api/tickets/[id]/pdf', () => {
    const download = (id: string) =>
      ticketPdf(new Request(url(`/api/tickets/${id}/pdf?locale=es`)), context({ id }));

    it('gives the owner a private PDF', async () => {
      const { email, userId, paymentId } = await paidRunner();
      const ticket = await ticketOf(paymentId, userId);
      await signIn(email);

      const response = await download(ticket);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/pdf');
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(new TextDecoder().decode((await response.arrayBuffer()).slice(0, 4))).toBe('%PDF');
    });

    it('hides it from another runner', async () => {
      const { userId, paymentId } = await paidRunner();
      const ticket = await ticketOf(paymentId, userId);
      await runner();

      expect((await download(ticket)).status).toBe(404);
    });

    it('hides it from a signed-out visitor', async () => {
      const { userId, paymentId } = await paidRunner();
      const ticket = await ticketOf(paymentId, userId);
      resetRequest();

      expect((await download(ticket)).status).toBe(404);
    });
  });

  describe('GET /api/admin/exports/[kind]', () => {
    const exported = (kind: string) =>
      exportCsv(new Request(url(`/api/admin/exports/${kind}`)), context({ kind }));

    it.each(['registrations', 'shirts'])('gives an admin the %s CSV', async (kind) => {
      await signIn(ADMIN_EMAIL);

      const response = await exported(kind);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8');
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(response.headers.get('content-disposition')).toContain(`catarinotlon-${kind}.csv`);
      expect(new Uint8Array(await response.arrayBuffer()).slice(0, 3)).toEqual(
        new Uint8Array([0xef, 0xbb, 0xbf]),
      );
    });

    it('hides exports from a runner', async () => {
      await runner();

      expect((await exported('registrations')).status).toBe(404);
    });

    it('hides exports from a signed-out visitor', async () => {
      expect((await exported('registrations')).status).toBe(404);
    });

    it('answers 404 for an unknown export', async () => {
      await signIn(ADMIN_EMAIL);

      expect((await exported('passwords')).status).toBe(404);
    });
  });

  describe('GET /api/cron/race-reminders', () => {
    const call = (campaign: string, secret?: string) =>
      cron(
        new Request(url(`/api/cron/race-reminders?campaign=${campaign}`), {
          headers: secret ? { authorization: `Bearer ${secret}` } : {},
        }),
      );

    it('stays closed without the secret', async () => {
      expect((await call('kit-pickup')).status).toBe(404);
    });

    it('stays closed with a wrong secret', async () => {
      expect((await call('kit-pickup', 'wrong-secret-value')).status).toBe(404);
    });

    it('refuses an unknown campaign', async () => {
      expect((await call('other', CRON_SECRET)).status).toBe(400);
    });

    it.each(['kit-pickup', 'race-day'])('runs the %s campaign', async (campaign) => {
      const response = await call(campaign, CRON_SECRET);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(expect.any(Object));
    });
  });
});
