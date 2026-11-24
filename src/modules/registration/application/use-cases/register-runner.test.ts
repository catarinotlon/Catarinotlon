import { beforeEach, describe, expect, it } from 'vitest';

import type { Clock, IdGenerator, RandomSource } from '@/shared/domain/system-ports';

import { InMemoryRegistrationRepository } from '../../infrastructure/in-memory-registration-repository';
import type { RegistrationSettings } from '../ports/registration-settings-reader';
import { registerRunner, type RegisterRunnerInput } from './register-runner';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const clock: Clock = { now: () => NOW };

function sequentialIds(): IdGenerator {
  let next = 0;
  return { uuid: () => `id-${++next}` };
}

function randomSequence(...values: number[]): RandomSource {
  let index = 0;
  return { next: () => values[Math.min(index++, values.length - 1)] ?? 0 };
}

const openSettings: RegistrationSettings = { feeCents: 12345, shirtSizes: ['size-a', 'size-b'] };

const input: RegisterRunnerInput = {
  ownerId: 'user-1',
  runnerName: '  Runner One ',
  distance: '5K',
  shirtSize: 'size-a',
  shirtName: ' One ',
  locale: 'es',
};

describe('registerRunner', () => {
  let registrations: InMemoryRegistrationRepository;
  let ids: IdGenerator;

  function deps(overrides: { random?: RandomSource; settings?: RegistrationSettings | null } = {}) {
    const settings = overrides.settings === undefined ? openSettings : overrides.settings;
    return {
      registrations,
      settings: { read: async () => settings },
      clock,
      ids,
      random: overrides.random ?? randomSequence(0.5),
    };
  }

  beforeEach(() => {
    registrations = new InMemoryRegistrationRepository();
    ids = sequentialIds();
  });

  it('saves a pending registration with the fee currently in force', async () => {
    const result = await registerRunner(deps(), input);

    expect(result.ok).toBe(true);
    expect(await registrations.listByOwner('user-1')).toMatchObject([
      {
        id: 'id-1',
        runnerName: 'Runner One',
        shirtName: 'One',
        distance: '5K',
        bibNumber: '55000',
        feeCents: 12345,
        status: 'pending_payment',
        createdAt: NOW,
      },
    ]);
  });

  it('lets one account register several runners', async () => {
    await registerRunner(deps({ random: randomSequence(0.1) }), input);
    await registerRunner(deps({ random: randomSequence(0.2) }), {
      ...input,
      runnerName: 'Runner Two',
    });

    expect(await registrations.listByOwner('user-1')).toHaveLength(2);
  });

  it('retries with a new bib number on a collision', async () => {
    await registerRunner(deps({ random: randomSequence(0.5) }), input);

    const result = await registerRunner(deps({ random: randomSequence(0.5, 0.5, 0.25) }), {
      ...input,
      ownerId: 'user-2',
    });

    expect(result.ok && result.value.bibNumber).toBe('32500');
  });

  it('fails rather than loop forever when every bib number collides', async () => {
    await registerRunner(deps({ random: randomSequence(0.5) }), input);

    const result = await registerRunner(deps({ random: randomSequence(0.5) }), {
      ...input,
      ownerId: 'user-2',
    });

    expect(result).toEqual({ ok: false, error: { code: 'registration.bib_number_exhausted' } });
  });

  it('is closed while the fee is not configured', async () => {
    const result = await registerRunner(deps({ settings: null }), input);

    expect(result).toEqual({ ok: false, error: { code: 'registration.not_open' } });
    expect(await registrations.listByOwner('user-1')).toEqual([]);
  });

  it('rejects a shirt size that is not configured', async () => {
    const result = await registerRunner(deps(), { ...input, shirtSize: 'size-z' });

    expect(result).toEqual({ ok: false, error: { code: 'registration.invalid_shirt_size' } });
  });

  it('rejects an invalid distance', async () => {
    const result = await registerRunner(deps(), { ...input, distance: '10K' });

    expect(result).toEqual({ ok: false, error: { code: 'registration.invalid_distance' } });
  });

  it('rejects a blank shirt name', async () => {
    const result = await registerRunner(deps(), { ...input, shirtName: '  ' });

    expect(result).toEqual({ ok: false, error: { code: 'registration.shirt_name_required' } });
  });

  it('rejects a blank runner name', async () => {
    const result = await registerRunner(deps(), { ...input, runnerName: '  ' });

    expect(result).toEqual({ ok: false, error: { code: 'registration.runner_name_required' } });
  });
});
