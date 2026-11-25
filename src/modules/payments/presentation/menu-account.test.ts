import { describe, expect, it } from 'vitest';

import {
  createRegistration,
  type BibNumber,
  type Registration,
  type ShirtName,
} from '@/modules/registration';

import type { RunnerPanel, RunnerStage } from '../application/use-cases/account-overview';
import { toMenuAccount } from './menu-account';

const panel = (id: string, stage: RunnerStage, status: Registration['status']): RunnerPanel => ({
  registration: {
    ...createRegistration({
      id,
      ownerId: 'owner',
      runnerName: `Runner ${id}`,
      distance: id === 'a' ? '3K' : '5K',
      shirtSize: 'size-a',
      shirtName: 'NAME' as ShirtName,
      bibNumber: `1000${id === 'a' ? 1 : 2}` as BibNumber,
      feeCents: 10000,
      locale: 'es',
      createdAt: new Date(Date.UTC(2026, 5, 1)),
    }),
    status,
  },
  stage,
  ticket: null,
  payment: null,
  rejectionReason: null,
});

describe('toMenuAccount', () => {
  it('lists each runner with only what the menu shows', () => {
    const account = toMenuAccount(
      'Sofía Ramírez',
      [panel('a', 'confirmed', 'confirmed'), panel('b', 'payment_in_review', 'payment_in_review')],
      true,
    );

    expect(account).toEqual({
      name: 'Sofía Ramírez',
      payableCount: 0,
      runners: [
        { id: 'a', name: 'Runner a', distance: '3K', bibNumber: '10001', stage: 'confirmed' },
        {
          id: 'b',
          name: 'Runner b',
          distance: '5K',
          bibNumber: '10002',
          stage: 'payment_in_review',
        },
      ],
    });
  });

  it('counts the unpaid and the rejected runners as payable while payment is open', () => {
    const panels = [
      panel('a', 'pending_payment', 'pending_payment'),
      panel('b', 'receipt_rejected', 'pending_payment'),
      panel('c', 'payment_in_review', 'payment_in_review'),
      panel('d', 'confirmed', 'confirmed'),
    ];

    expect(toMenuAccount('Sofía', panels, true).payableCount).toBe(2);
  });

  it('offers nothing to pay while payment is closed', () => {
    const panels = [panel('a', 'pending_payment', 'pending_payment')];

    expect(toMenuAccount('Sofía', panels, false).payableCount).toBe(0);
  });
});
