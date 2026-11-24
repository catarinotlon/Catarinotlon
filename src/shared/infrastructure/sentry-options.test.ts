import { describe, expect, it } from 'vitest';

import { sentryOptions } from './sentry-options';

describe('sentryOptions', () => {
  it('is disabled without a DSN', () => {
    expect(sentryOptions(undefined)).toMatchObject({ enabled: false });
    expect(sentryOptions(undefined)).not.toHaveProperty('dsn');
  });

  it('is enabled with a DSN', () => {
    expect(sentryOptions('https://key@example.test/1')).toMatchObject({
      enabled: true,
      dsn: 'https://key@example.test/1',
    });
  });

  it('opts out of every category that can carry personal data', () => {
    expect(sentryOptions(undefined).dataCollection).toEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    });
  });

  it('scrubs every event before it is sent', () => {
    const { beforeSend } = sentryOptions(undefined);

    expect(beforeSend({ message: 'runner@example.test failed', user: { id: '1' } })).toEqual({
      message: '[email] failed',
    });
  });
});
