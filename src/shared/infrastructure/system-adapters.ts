import { randomInt, randomUUID } from 'node:crypto';

import type { Clock, IdGenerator, RandomSource } from '@/shared/domain/system-ports';

const RANDOM_RANGE = 2 ** 32;

/** {@link Clock} backed by the system time. */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

/** {@link IdGenerator} backed by the platform's UUID generator. */
export class CryptoIdGenerator implements IdGenerator {
  uuid(): string {
    return randomUUID();
  }
}

/** {@link RandomSource} backed by a cryptographic generator. */
export class CryptoRandomSource implements RandomSource {
  next(): number {
    return randomInt(RANDOM_RANGE) / RANDOM_RANGE;
  }
}
