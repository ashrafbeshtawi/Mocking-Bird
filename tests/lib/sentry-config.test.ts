jest.mock('@sentry/nextjs', () => ({
  init: jest.fn(),
  captureConsoleIntegration: jest.fn(() => ({ name: 'CaptureConsole' })),
}));

import * as Sentry from '@sentry/nextjs';

const mockInit = Sentry.init as jest.Mock;
const originalEnv = process.env;

const loadConfig = (dsn: string | undefined) => {
  process.env = { ...originalEnv, SENTRY_DSN: dsn };
  jest.isolateModules(() => {
    require('../../sentry.server.config');
  });
};

describe('sentry.server.config', () => {
  beforeEach(() => mockInit.mockClear());
  afterEach(() => {
    process.env = originalEnv;
  });

  it('stays disabled when SENTRY_DSN is unset', () => {
    loadConfig(undefined);

    expect(mockInit).toHaveBeenCalledWith(expect.objectContaining({ dsn: undefined, enabled: false }));
  });

  it('stays disabled when SENTRY_DSN is empty', () => {
    loadConfig('');

    expect(mockInit).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('reports to the configured DSN and captures console.error as events', () => {
    loadConfig('https://key@glitchtip.example/1');

    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://key@glitchtip.example/1',
        enabled: true,
        integrations: [{ name: 'CaptureConsole' }],
      })
    );
    expect(Sentry.captureConsoleIntegration).toHaveBeenCalledWith({ levels: ['error'] });
  });
});
