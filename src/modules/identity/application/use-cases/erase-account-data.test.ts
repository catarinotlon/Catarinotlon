import { describe, expect, it } from 'vitest';

import type { ErasureRequest } from '../ports/personal-data-eraser';
import { eraseAccountData } from './erase-account-data';

const NOW = new Date('2026-06-01T12:00:00.000Z');

describe('eraseAccountData', () => {
  it('erases the account and records who ran it and when', async () => {
    const requests: ErasureRequest[] = [];

    await eraseAccountData(
      {
        eraser: { erase: async (request) => void requests.push(request) },
        clock: { now: () => NOW },
        ids: { uuid: () => 'record-1' },
      },
      { adminId: 'admin-1', userId: 'target' },
    );

    expect(requests).toEqual([
      { recordId: 'record-1', userId: 'target', performedBy: 'admin-1', at: NOW },
    ]);
  });
});
