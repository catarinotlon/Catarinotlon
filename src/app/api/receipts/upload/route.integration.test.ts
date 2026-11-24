import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { signInAction, signUpAction } from '@/modules/identity/presentation/auth-actions';
import {
  form,
  migrateActionDatabase,
  OPEN_SETTINGS,
  redirectOf,
  resetRequest,
  setSettings,
  sql,
} from '@/test/action-harness';

import { POST } from './route';

vi.hoisted(() => {
  vi.stubEnv('RECEIPT_STORAGE', 'blob');
  vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'vercel_blob_rw_test_token');
});

vi.mock('@vercel/blob/client', () => ({
  handleUpload: async ({
    body,
    onBeforeGenerateToken,
  }: {
    body: { pathname: string };
    onBeforeGenerateToken: (pathname: string) => Promise<unknown>;
  }) => ({ constraints: await onBeforeGenerateToken(body.pathname) }),
}));

const PASSWORD = 'correct-horse-battery';
let counter = 0;

const request = (pathname: string) =>
  new Request('http://localhost:3000/api/receipts/upload', {
    method: 'POST',
    body: JSON.stringify({ pathname }),
  });

async function signedInUser() {
  const email = `blob-${++counter}@actions.test`;
  resetRequest();
  await redirectOf(() =>
    signUpAction(
      {},
      form({
        name: 'Blob Test',
        email,
        password: PASSWORD,
        phone: '5500000000',
        acceptLegal: 'on',
        distance: '5K',
        shirtSize: 'TEST-M',
        shirtName: 'Blob',
      }),
    ),
  );
  await sql('UPDATE user SET email_verified = 1 WHERE email = ?', [email]);
  resetRequest();
  await redirectOf(() => signInAction({}, form({ email, password: PASSWORD })));
  const [row] = await sql('SELECT id FROM user WHERE email = ?', [email]);
  return String(row?.id);
}

describe('POST /api/receipts/upload', () => {
  beforeAll(async () => {
    await migrateActionDatabase();
    await setSettings(OPEN_SETTINGS);
  });

  beforeEach(resetRequest);

  it('issues a token limited to receipts for the user’s own folder', async () => {
    const userId = await signedInUser();

    const response = await POST(request(`receipts/${userId}/file.pdf`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      constraints: {
        allowedContentTypes: expect.arrayContaining(['application/pdf', 'image/png']),
        maximumSizeInBytes: 1000,
        addRandomSuffix: false,
        allowOverwrite: false,
      },
    });
  });

  it('refuses a signed-out visitor', async () => {
    expect((await POST(request('receipts/someone/file.pdf'))).status).toBe(400);
  });

  it('refuses another user’s folder', async () => {
    const victim = await signedInUser();
    await signedInUser();

    expect((await POST(request(`receipts/${victim}/file.pdf`))).status).toBe(400);
  });
});
