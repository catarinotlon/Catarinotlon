import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { localReceiptStore } from '@/composition';
import { signInAction, signUpAction } from '@/modules/identity/presentation/auth-actions';
import {
  form,
  migrateActionDatabase,
  OPEN_SETTINGS,
  redirectOf,
  requestContext,
  resetRequest,
  setSettings,
  sql,
} from '@/test/action-harness';

import {
  confirmPaymentAction,
  createRegistrationAction,
  deliverKitAction,
  editRegistrationAction,
  rejectPaymentAction,
  saveSettingsAction,
  undoKitAction,
} from './admin-actions';
import { recordReceiptAction } from './payment-actions';

const PASSWORD = 'correct-horse-battery';
const ADMIN_EMAIL = 'admin@actions.test';
let counter = 0;

async function signUpAndVerify(email: string) {
  resetRequest();
  await redirectOf(() =>
    signUpAction(
      {},
      form({
        name: 'Test Person',
        email,
        password: PASSWORD,
        phone: '5500000000',
        acceptLegal: 'on',
        distance: '3K',
        shirtSize: 'TEST-M',
        shirtName: 'Person',
      }),
    ),
  );
  await sql('UPDATE user SET email_verified = 1 WHERE email = ?', [email]);
}

async function signIn(email: string) {
  resetRequest();
  await redirectOf(() => signInAction({}, form({ email, password: PASSWORD })));
}

const asAdmin = () => signIn(ADMIN_EMAIL);

async function runnerInReview() {
  const email = `reviewed-${++counter}@actions.test`;
  await signUpAndVerify(email);
  await signIn(email);
  const [row] = await sql(
    'SELECT r.id, r.owner_id FROM registrations r JOIN user u ON u.id = r.owner_id WHERE u.email = ?',
    [email],
  );
  const registrationId = String(row?.id);
  const pathname = `receipts/${String(row?.owner_id)}/receipt.pdf`;
  await localReceiptStore()?.write(pathname, 'application/pdf', new Uint8Array(10));
  await redirectOf(() => recordReceiptAction({ pathname }));
  const [payment] = await sql('SELECT id FROM payments WHERE owner_id = ?', [
    String(row?.owner_id),
  ]);
  return { email, registrationId, paymentId: String(payment?.id) };
}

async function confirmedRunner() {
  const runner = await runnerInReview();
  await asAdmin();
  await confirmPaymentAction({}, form({ paymentId: runner.paymentId }));
  return runner;
}

const status = async (id: string) =>
  (await sql('SELECT status FROM registrations WHERE id = ?', [id]))[0]?.status;
const tickets = (id: string) =>
  sql('SELECT id FROM tickets WHERE registration_id = ? AND deleted_at IS NULL', [id]);

describe('admin server actions', () => {
  beforeAll(async () => {
    await migrateActionDatabase();
    await setSettings(OPEN_SETTINGS);
    await signUpAndVerify(ADMIN_EMAIL);
  });

  beforeEach(async () => {
    resetRequest();
    await setSettings(OPEN_SETTINGS);
  });

  describe('authorization', () => {
    const actions = [
      ['confirmPaymentAction', confirmPaymentAction],
      ['rejectPaymentAction', rejectPaymentAction],
      ['deliverKitAction', deliverKitAction],
      ['undoKitAction', undoKitAction],
      ['editRegistrationAction', editRegistrationAction],
      ['createRegistrationAction', createRegistrationAction],
      ['saveSettingsAction', saveSettingsAction],
    ] as const;

    it.each(actions)('%s refuses a signed-out visitor', async (_name, action) => {
      expect(await action({}, form({}))).toEqual({ formError: 'errors.generic' });
    });

    it.each(actions)('%s refuses a runner', async (_name, action) => {
      const email = `not-admin-${++counter}@actions.test`;
      await signUpAndVerify(email);
      await signIn(email);

      expect(await action({}, form({}))).toEqual({ formError: 'errors.generic' });
    });

    it('a runner cannot confirm their own payment', async () => {
      const { email, paymentId, registrationId } = await runnerInReview();
      await signIn(email);

      await confirmPaymentAction({}, form({ paymentId }));

      expect(await status(registrationId)).toBe('payment_in_review');
      expect(await tickets(registrationId)).toEqual([]);
    });

    it('an unverified address on the allowlist is not an admin', async () => {
      const { paymentId, registrationId } = await runnerInReview();
      await asAdmin();
      await sql('UPDATE user SET email_verified = 0 WHERE email = ?', [ADMIN_EMAIL]);

      await confirmPaymentAction({}, form({ paymentId }));
      await sql('UPDATE user SET email_verified = 1 WHERE email = ?', [ADMIN_EMAIL]);

      expect(await status(registrationId)).toBe('payment_in_review');
    });
  });

  describe('payment review', () => {
    it('confirms the runner, records the reviewer, and issues one ticket', async () => {
      const { paymentId, registrationId } = await runnerInReview();
      await asAdmin();

      expect(await confirmPaymentAction({}, form({ paymentId }))).toEqual({ done: true });

      expect(await status(registrationId)).toBe('confirmed');
      expect(await tickets(registrationId)).toHaveLength(1);
      const [payment] = await sql('SELECT status, reviewed_by FROM payments WHERE id = ?', [
        paymentId,
      ]);
      expect(payment?.status).toBe('confirmed');
      expect(payment?.reviewed_by).toEqual(expect.any(String));
      expect(requestContext.revalidated).toContain('/[locale]/admin:layout');
    });

    it('does not confirm twice', async () => {
      const { paymentId, registrationId } = await confirmedRunner();

      expect(await confirmPaymentAction({}, form({ paymentId }))).toEqual({
        formError: 'payment.errors.not_in_review',
      });
      expect(await tickets(registrationId)).toHaveLength(1);
    });

    it('rejects with a reason and returns the runner to pending', async () => {
      const { paymentId, registrationId } = await runnerInReview();
      await asAdmin();

      await rejectPaymentAction({}, form({ paymentId, reason: 'Monto distinto' }));

      expect(await status(registrationId)).toBe('pending_payment');
      expect(await sql('SELECT rejection_reason FROM payments WHERE id = ?', [paymentId])).toEqual([
        { rejection_reason: 'Monto distinto' },
      ]);
      expect(requestContext.revalidated).toContain('/[locale]/admin:layout');
    });

    it('requires a reason', async () => {
      const { paymentId, registrationId } = await runnerInReview();
      await asAdmin();

      expect(await rejectPaymentAction({}, form({ paymentId, reason: ' ' }))).toEqual({
        fieldErrors: { reason: 'admin.review.reasonRequired' },
      });
      expect(await status(registrationId)).toBe('payment_in_review');
    });
  });

  describe('kit pickup', () => {
    it('delivers a confirmed runner’s kit and records who collected it', async () => {
      const { registrationId } = await confirmedRunner();

      expect(
        await deliverKitAction({}, form({ registrationId, collectedBy: ' Una tía ' })),
      ).toEqual({ done: true });

      expect(
        await sql('SELECT collected_by FROM kit_pickups WHERE registration_id = ?', [
          registrationId,
        ]),
      ).toEqual([{ collected_by: 'Una tía' }]);
      expect(requestContext.revalidated).toContain('/[locale]/admin:layout');
    });

    it('records nobody when the collector is left blank', async () => {
      const { registrationId } = await confirmedRunner();

      await deliverKitAction({}, form({ registrationId, collectedBy: '   ' }));

      expect(
        await sql('SELECT collected_by FROM kit_pickups WHERE registration_id = ?', [
          registrationId,
        ]),
      ).toEqual([{ collected_by: null }]);
    });

    it('refuses a runner who is not confirmed', async () => {
      const { registrationId } = await runnerInReview();
      await asAdmin();

      expect(await deliverKitAction({}, form({ registrationId }))).toEqual({
        formError: 'admin.kits.errors.registration_not_confirmed',
      });
    });

    it('refuses a kit delivered already', async () => {
      const { registrationId } = await confirmedRunner();
      await deliverKitAction({}, form({ registrationId }));

      expect(await deliverKitAction({}, form({ registrationId }))).toEqual({
        formError: 'admin.kits.errors.kit_already_delivered',
      });
    });

    it('undoes a delivery and keeps it on record', async () => {
      const { registrationId } = await confirmedRunner();
      await deliverKitAction({}, form({ registrationId }));

      expect(await undoKitAction({}, form({ registrationId }))).toEqual({ done: true });

      const rows = await sql('SELECT undone_at FROM kit_pickups WHERE registration_id = ?', [
        registrationId,
      ]);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.undone_at).not.toBeNull();
      expect(requestContext.revalidated).toContain('/[locale]/admin:layout');
    });

    it('has nothing to undo on an undelivered kit', async () => {
      const { registrationId } = await confirmedRunner();

      expect(await undoKitAction({}, form({ registrationId }))).toEqual({
        formError: 'admin.kits.errors.kit_not_delivered',
      });
    });
  });

  describe('registrations', () => {
    const fields = {
      runnerName: 'Walk In',
      distance: '5K',
      shirtSize: 'TEST-S',
      shirtName: 'Walk',
    };

    it('corrects a registration and records the change', async () => {
      const { registrationId } = await runnerInReview();
      await asAdmin();

      const state = await editRegistrationAction({}, form({ ...fields, registrationId }));

      expect(state).toEqual({ done: true });
      expect(
        await sql(
          `SELECT field, previous_value, new_value FROM registration_changes
           WHERE registration_id = ? AND field = 'distance'`,
          [registrationId],
        ),
      ).toEqual([{ field: 'distance', previous_value: '3K', new_value: '5K' }]);
      expect(requestContext.revalidated).toContain('/[locale]/admin:layout');
    });

    it('can change the size after the runner’s deadline', async () => {
      const { registrationId } = await runnerInReview();
      await setSettings({ ...OPEN_SETTINGS, shirtSizeDeadline: '2000-01-01T00:00:00.000Z' });
      await asAdmin();

      await editRegistrationAction({}, form({ ...fields, registrationId }));

      expect(
        await sql('SELECT shirt_size FROM registrations WHERE id = ?', [registrationId]),
      ).toEqual([{ shirt_size: 'TEST-S' }]);
    });

    it('reports a blank field', async () => {
      const { registrationId } = await runnerInReview();
      await asAdmin();

      const state = await editRegistrationAction(
        {},
        form({ ...fields, registrationId, shirtName: ' ' }),
      );

      expect(state.fieldErrors).toEqual({
        shirtName: 'errors.registration.shirt_name_required',
      });
    });

    it('registers a walk-in with the payment received, with a ticket', async () => {
      await asAdmin();
      const runnerName = `Walk In ${++counter}`;

      const target = await redirectOf(() =>
        createRegistrationAction(
          {},
          form({
            ...fields,
            runnerName,
            contactEmail: 'walkin@actions.test',
            paymentReceived: 'on',
          }),
        ),
      );

      expect(target).toBe('/es/admin');
      const [row] = await sql(
        'SELECT id, owner_id, status, contact_email FROM registrations WHERE runner_name = ?',
        [runnerName],
      );
      expect(row).toMatchObject({
        owner_id: null,
        status: 'confirmed',
        contact_email: 'walkin@actions.test',
      });
      expect(await tickets(String(row?.id))).toHaveLength(1);
      expect(requestContext.revalidated).toContain('/[locale]/admin:layout');
    });

    it('stores the walk-in’s phone and the admin’s locale', async () => {
      await asAdmin();
      requestContext.locale = 'en';
      const runnerName = `Walk In ${++counter}`;

      await redirectOf(() =>
        createRegistrationAction({}, form({ ...fields, runnerName, contactPhone: ' 5512 ' })),
      );

      expect(
        await sql('SELECT contact_phone, locale FROM registrations WHERE runner_name = ?', [
          runnerName,
        ]),
      ).toEqual([{ contact_phone: '5512', locale: 'en' }]);
    });

    it('reports a walk-in with a blank name on its field', async () => {
      await asAdmin();

      const state = await createRegistrationAction({}, form({ ...fields, runnerName: ' ' }));

      expect(state.fieldErrors).toEqual({
        runnerName: 'errors.registration.runner_name_required',
      });
    });

    it('reports every invalid field of a walk-in at once', async () => {
      await asAdmin();

      const state = await createRegistrationAction(
        {},
        form({ ...fields, runnerName: ' ', distance: '10K', shirtSize: '', shirtName: ' ' }),
      );

      expect(state.fieldErrors).toEqual({
        runnerName: 'errors.registration.runner_name_required',
        distance: 'errors.registration.invalid_distance',
        shirtSize: 'errors.registration.invalid_shirt_size',
        shirtName: 'errors.registration.shirt_name_required',
      });
    });

    it('reports every invalid field of an edit at once', async () => {
      const { registrationId } = await runnerInReview();
      await asAdmin();

      const state = await editRegistrationAction(
        {},
        form({
          registrationId,
          runnerName: ' ',
          distance: '5K',
          shirtSize: 'TEST-S',
          shirtName: ' ',
        }),
      );

      expect(state.fieldErrors).toEqual({
        runnerName: 'errors.registration.runner_name_required',
        shirtName: 'errors.registration.shirt_name_required',
      });
    });

    it('leaves a walk-in pending when the payment was not received', async () => {
      await asAdmin();
      const runnerName = `Walk In ${++counter}`;

      await redirectOf(() => createRegistrationAction({}, form({ ...fields, runnerName })));

      const [row] = await sql('SELECT id, status FROM registrations WHERE runner_name = ?', [
        runnerName,
      ]);
      expect(row?.status).toBe('pending_payment');
      expect(await tickets(String(row?.id))).toEqual([]);
    });
  });

  describe('event settings', () => {
    const current = async () => {
      const [row] = await sql(
        `SELECT "values" FROM event_settings_versions ORDER BY created_at DESC, rowid DESC LIMIT 1`,
      );
      return JSON.parse(String(row?.values)) as typeof OPEN_SETTINGS;
    };

    it('saves one section and keeps the others', async () => {
      await asAdmin();

      const state = await saveSettingsAction(
        {},
        form({ section: 'registration', fee: '432.10', shirtSizes: 'TEST-S, TEST-M' }),
      );

      expect(state).toEqual({ done: true });
      expect(await current()).toMatchObject({
        feeCents: 43210,
        venue: OPEN_SETTINGS.venue,
        bank: OPEN_SETTINGS.bank,
      });
      expect(requestContext.revalidated).toContain('/:layout');
    });

    it('reports an unreadable price', async () => {
      await asAdmin();

      expect(await saveSettingsAction({}, form({ section: 'registration', fee: 'abc' }))).toEqual({
        formError: 'admin.settings.errors.invalid_fee',
      });
    });

    const newBank = {
      section: 'bank',
      beneficiary: 'NUEVO',
      bank: 'OTRO BANCO',
      clabe: OPEN_SETTINGS.bank.clabe,
    };

    it('requires the password to change the bank data', async () => {
      await asAdmin();

      expect(await saveSettingsAction({}, form(newBank))).toEqual({
        formError: 'admin.settings.errors.password_required',
      });
      expect((await current()).bank).toEqual(OPEN_SETTINGS.bank);
    });

    it('refuses a wrong password', async () => {
      await asAdmin();

      expect(
        await saveSettingsAction({}, form({ ...newBank, password: 'wrong-password' })),
      ).toEqual({ formError: 'admin.settings.errors.wrong_password' });
    });

    it('saves the bank data with the correct password', async () => {
      await asAdmin();

      expect(await saveSettingsAction({}, form({ ...newBank, password: PASSWORD }))).toEqual({
        done: true,
      });
      expect((await current()).bank.bank).toBe('OTRO BANCO');
    });

    it('refuses a CLABE with a wrong check digit', async () => {
      await asAdmin();

      expect(
        await saveSettingsAction(
          {},
          form({ ...newBank, clabe: '002010077777777772', password: PASSWORD }),
        ),
      ).toEqual({ formError: 'admin.settings.errors.invalid_clabe' });
    });
  });
});
