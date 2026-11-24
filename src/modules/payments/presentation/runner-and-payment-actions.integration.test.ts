import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { localReceiptStore } from '@/composition';
import { signInAction, signUpAction } from '@/modules/identity/presentation/auth-actions';
import {
  addRunnerAction,
  completeRegistrationAction,
  saveDistanceAction,
  saveShirtNameAction,
  saveShirtSizeAction,
} from '@/modules/registration/presentation/runner-actions';
import {
  CLOSED_SETTINGS,
  form,
  migrateActionDatabase,
  OPEN_SETTINGS,
  redirectOf,
  requestContext,
  resetRequest,
  setSettings,
  sql,
} from '@/test/action-harness';

import { recordReceiptAction, replaceReceiptAction } from './payment-actions';

const PASSWORD = 'correct-horse-battery';
let counter = 0;

const runnerFields = (overrides: Record<string, string> = {}) => ({
  runnerName: 'Second Runner',
  distance: '5K',
  shirtSize: 'TEST-S',
  shirtName: 'Second',
  ...overrides,
});

async function signedInRunner(register = true) {
  await setSettings(register ? OPEN_SETTINGS : CLOSED_SETTINGS);
  const email = `payer-${++counter}@actions.test`;
  resetRequest();
  await redirectOf(() =>
    signUpAction(
      {},
      form({
        name: 'Payer Test',
        email,
        password: PASSWORD,
        phone: '5500000000',
        acceptLegal: 'on',
        ...(register ? { distance: '3K', shirtSize: 'TEST-M', shirtName: 'Payer' } : {}),
      }),
    ),
  );
  await sql('UPDATE user SET email_verified = 1 WHERE email = ?', [email]);
  resetRequest();
  await redirectOf(() => signInAction({}, form({ email, password: PASSWORD })));
  await setSettings(OPEN_SETTINGS);
  const [user] = await sql('SELECT id FROM user WHERE email = ?', [email]);
  return { email, userId: String(user?.id) };
}

const runnersOf = (userId: string) =>
  sql(
    `SELECT id, runner_name, distance, shirt_size, shirt_name, status
     FROM registrations WHERE owner_id = ? ORDER BY created_at, rowid`,
    [userId],
  );

async function storeReceipt(
  userId: string,
  name = 'file.pdf',
  type = 'application/pdf',
  size = 10,
) {
  const pathname = `receipts/${userId}/${name}`;
  await localReceiptStore()?.write(pathname, type, new Uint8Array(size));
  return pathname;
}

describe('runner server actions', () => {
  beforeAll(migrateActionDatabase);
  beforeEach(resetRequest);

  describe('completeRegistrationAction', () => {
    it('saves the first runner with phone and consent, then continues to payment', async () => {
      const { userId } = await signedInRunner(false);

      const target = await redirectOf(() =>
        completeRegistrationAction(
          {},
          form({ ...runnerFields(), phone: '5511111111', acceptLegal: 'on', intent: 'pay' }),
        ),
      );

      expect(target).toBe('/es/pago');
      expect(await runnersOf(userId)).toMatchObject([{ runner_name: 'Second Runner' }]);
      expect(await sql('SELECT phone FROM account_profiles WHERE user_id = ?', [userId])).toEqual([
        { phone: '5511111111' },
      ]);
    });

    it('requires the phone and consent', async () => {
      const { userId } = await signedInRunner(false);

      const state = await completeRegistrationAction({}, form({ ...runnerFields(), phone: ' ' }));

      expect(state.fieldErrors).toEqual({
        phone: 'errors.required',
        acceptLegal: 'errors.acceptLegal',
      });
      expect(await runnersOf(userId)).toEqual([]);
    });

    it('sends a signed-out visitor to sign in', async () => {
      resetRequest();

      expect(await redirectOf(() => completeRegistrationAction({}, form(runnerFields())))).toBe(
        '/es/iniciar-sesion',
      );
    });
  });

  describe('addRunnerAction', () => {
    it('adds a runner and continues to payment', async () => {
      const { userId } = await signedInRunner();

      const target = await redirectOf(() =>
        addRunnerAction({}, form({ ...runnerFields(), intent: 'pay' })),
      );

      expect(target).toBe('/es/pago');
      expect(await runnersOf(userId)).toHaveLength(2);
    });

    it('comes back for another runner on request', async () => {
      await signedInRunner();

      const target = await redirectOf(() =>
        addRunnerAction({}, form({ ...runnerFields(), intent: 'another' })),
      );

      expect(target).toBe('/es/cuenta/corredores/nuevo');
    });

    it('adds a runner without asking for consent again', async () => {
      const { userId } = await signedInRunner();

      await redirectOf(() => addRunnerAction({}, form({ ...runnerFields(), intent: 'pay' })));

      expect(await runnersOf(userId)).toHaveLength(2);
    });

    it('keeps only the account holder’s acceptance', async () => {
      const { userId } = await signedInRunner();
      const before = await sql('SELECT id FROM legal_acceptances WHERE user_id = ?', [userId]);

      await redirectOf(() => addRunnerAction({}, form({ ...runnerFields(), intent: 'pay' })));

      expect(
        await sql('SELECT id FROM legal_acceptances WHERE user_id = ?', [userId]),
      ).toHaveLength(before.length);
    });

    it('maps a size that is not on offer to its field', async () => {
      await signedInRunner();

      const state = await addRunnerAction({}, form(runnerFields({ shirtSize: 'TEST-Z' })));

      expect(state.fieldErrors).toEqual({ shirtSize: 'errors.registration.invalid_shirt_size' });
    });

    it('reports a blank runner name on its field', async () => {
      await signedInRunner();

      const state = await addRunnerAction({}, form(runnerFields({ runnerName: ' ' })));

      expect(state.fieldErrors).toEqual({
        runnerName: 'errors.registration.runner_name_required',
      });
    });
  });

  describe('editing a runner', () => {
    it('saves the shirt name', async () => {
      const { userId } = await signedInRunner();
      const [runner] = await runnersOf(userId);

      const state = await saveShirtNameAction(
        {},
        form({ registrationId: String(runner?.id), shirtName: 'Nuevo' }),
      );

      expect(state).toEqual({ done: true });
      expect((await runnersOf(userId))[0]?.shirt_name).toBe('Nuevo');
      expect(requestContext.revalidated).toContain('/[locale]/account:page');
    });

    it('saves the distance', async () => {
      const { userId } = await signedInRunner();
      const [runner] = await runnersOf(userId);

      await saveDistanceAction({}, form({ registrationId: String(runner?.id), distance: '5K' }));

      expect((await runnersOf(userId))[0]?.distance).toBe('5K');
    });

    it('saves the size before the deadline', async () => {
      const { userId } = await signedInRunner();
      const [runner] = await runnersOf(userId);

      await saveShirtSizeAction(
        {},
        form({ registrationId: String(runner?.id), shirtSize: 'TEST-S' }),
      );

      expect((await runnersOf(userId))[0]?.shirt_size).toBe('TEST-S');
    });

    it('refuses the size after the deadline', async () => {
      const { userId } = await signedInRunner();
      const [runner] = await runnersOf(userId);
      await setSettings({ ...OPEN_SETTINGS, shirtSizeDeadline: '2000-01-01T00:00:00.000Z' });

      const state = await saveShirtSizeAction(
        {},
        form({ registrationId: String(runner?.id), shirtSize: 'TEST-S' }),
      );

      expect(state).toEqual({ formError: 'errors.registration.shirt_size_deadline_passed' });
      expect((await runnersOf(userId))[0]?.shirt_size).toBe('TEST-M');
    });

    it('never changes another account’s runner', async () => {
      const victim = await signedInRunner();
      const [runner] = await runnersOf(victim.userId);
      await signedInRunner();

      const state = await saveShirtNameAction(
        {},
        form({ registrationId: String(runner?.id), shirtName: 'Hacked' }),
      );

      expect(state).toEqual({ formError: 'errors.registration.not_found' });
      expect((await runnersOf(victim.userId))[0]?.shirt_name).toBe('Payer');
    });

    it('refuses a signed-out visitor', async () => {
      const { userId } = await signedInRunner();
      const [runner] = await runnersOf(userId);
      resetRequest();

      const state = await saveDistanceAction(
        {},
        form({ registrationId: String(runner?.id), distance: '5K' }),
      );

      expect(state).toEqual({ formError: 'errors.generic' });
      expect((await runnersOf(userId))[0]?.distance).toBe('3K');
    });
  });
});

describe('payment server actions', () => {
  beforeAll(migrateActionDatabase);
  beforeEach(resetRequest);

  describe('recordReceiptAction', () => {
    it('records a stored receipt and moves the runner to review', async () => {
      const { userId } = await signedInRunner();
      const pathname = await storeReceipt(userId);

      const target = await redirectOf(() => recordReceiptAction({ pathname }));

      expect(target).toBe('/es/cuenta');
      expect((await runnersOf(userId))[0]?.status).toBe('payment_in_review');
      expect(requestContext.revalidated).toContain('/[locale]/account:page');
    });

    it('takes the type and size from the store, not from the browser', async () => {
      const { userId } = await signedInRunner();
      const pathname = await storeReceipt(userId, 'real.png', 'image/png', 7);

      await redirectOf(() => recordReceiptAction({ pathname }));

      expect(
        await sql('SELECT content_type, size_bytes FROM receipts WHERE pathname = ?', [pathname]),
      ).toEqual([{ content_type: 'image/png', size_bytes: 7 }]);
    });

    it('refuses a file in another user’s folder', async () => {
      const victim = await signedInRunner();
      const pathname = await storeReceipt(victim.userId);
      const attacker = await signedInRunner();

      const state = await recordReceiptAction({ pathname });

      expect(state).toEqual({ formError: 'payment.errors.not_found' });
      expect((await runnersOf(attacker.userId))[0]?.status).toBe('pending_payment');
    });

    it('refuses a path that was never uploaded', async () => {
      const { userId } = await signedInRunner();

      const state = await recordReceiptAction({ pathname: `receipts/${userId}/missing.pdf` });

      expect(state).toEqual({ formError: 'payment.errors.upload_failed' });
    });

    it('refuses a stored file of a forbidden type', async () => {
      const { userId } = await signedInRunner();
      const pathname = await storeReceipt(userId, 'page.html', 'text/html');

      expect(await recordReceiptAction({ pathname })).toEqual({
        formError: 'payment.errors.receipt_invalid_type',
      });
    });

    it('refuses a stored file over the limit', async () => {
      const { userId } = await signedInRunner();
      const pathname = await storeReceipt(userId, 'big.pdf', 'application/pdf', 1001);

      expect(await recordReceiptAction({ pathname })).toEqual({
        formError: 'payment.errors.receipt_too_large',
      });
    });

    it('is closed while the bank data is missing', async () => {
      const { userId } = await signedInRunner();
      const pathname = await storeReceipt(userId);
      await setSettings({ ...OPEN_SETTINGS, bank: null });

      expect(await recordReceiptAction({ pathname })).toEqual({
        formError: 'payment.errors.closed',
      });
    });

    it('sends a signed-out visitor to sign in', async () => {
      resetRequest();

      expect(await redirectOf(() => recordReceiptAction({ pathname: 'receipts/x/y.pdf' }))).toBe(
        '/es/iniciar-sesion',
      );
    });
  });

  describe('replaceReceiptAction', () => {
    async function paid() {
      const runner = await signedInRunner();
      const pathname = await storeReceipt(runner.userId);
      await redirectOf(() => recordReceiptAction({ pathname }));
      const [payment] = await sql('SELECT id FROM payments WHERE owner_id = ?', [runner.userId]);
      return { ...runner, paymentId: String(payment?.id) };
    }

    it('keeps the old file and makes the new one current', async () => {
      const { userId, paymentId } = await paid();
      const pathname = await storeReceipt(userId, 'second.pdf');

      requestContext.revalidated.length = 0;
      expect(await replaceReceiptAction({ pathname, paymentId })).toEqual({ done: true });
      expect(requestContext.revalidated).toContain('/[locale]/account:page');

      expect(
        await sql('SELECT pathname FROM receipts WHERE payment_id = ? ORDER BY position', [
          paymentId,
        ]),
      ).toEqual([
        { pathname: `receipts/${userId}/file.pdf` },
        { pathname: `receipts/${userId}/second.pdf` },
      ]);
    });

    it('sends a signed-out visitor to sign in', async () => {
      const { paymentId } = await paid();
      resetRequest();

      expect(
        await redirectOf(() => replaceReceiptAction({ pathname: 'receipts/x/y.pdf', paymentId })),
      ).toBe('/es/iniciar-sesion');
    });

    it('refuses a file outside the user’s folder', async () => {
      const victim = await signedInRunner();
      const foreign = await storeReceipt(victim.userId, 'foreign.pdf');
      const { paymentId } = await paid();

      expect(await replaceReceiptAction({ pathname: foreign, paymentId })).toEqual({
        formError: 'payment.errors.not_found',
      });
    });

    it('never replaces the receipt of another account’s payment', async () => {
      const { paymentId } = await paid();
      const attacker = await signedInRunner();
      const pathname = await storeReceipt(attacker.userId, 'attack.pdf');

      expect(await replaceReceiptAction({ pathname, paymentId })).toEqual({
        formError: 'payment.errors.not_found',
      });
    });
  });
});
