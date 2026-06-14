import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const oldEnv = { ...process.env };

afterEach(() => {
  process.env = { ...oldEnv };
  vi.resetModules();
  vi.doUnmock('os');
});

describe('saved credential target checks', () => {
  it('refuses to send config-file API keys to one-off custom hosts', async () => {
    const home = mkdtempSync(join(tmpdir(), 'zernio-home-'));
    clearZernioEnv();

    try {
      const { writeConfig } = await importWithHome<typeof import('../src/utils/config.js')>(home, '../src/utils/config.js');
      const { prepareApiRequest } = await importWithHome<typeof import('../src/utils/api-request.js')>(home, '../src/utils/api-request.js');
      writeConfig({ apiKey: 'sk_saved' });

      expect(() =>
        prepareApiRequest({
          baseUrl: 'https://evil.example/api',
          method: 'GET',
          path: '/v1/users',
        }),
      ).toThrow('Refusing to send a saved API key');
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('allows one-off custom hosts when the API key is also explicit', async () => {
    const { prepareApiRequest } = await import('../src/utils/api-request.js');

    const request = prepareApiRequest({
      apiKey: 'sk_explicit',
      baseUrl: 'https://example.test/api',
      method: 'GET',
      path: '/v1/users',
    });

    expect(request.url).toBe('https://example.test/api/v1/users');
    expect((request.init.headers as Headers).get('authorization')).toBe('Bearer sk_explicit');
  });

  it('allows trusted Zernio hosts for saved config keys', async () => {
    const home = mkdtempSync(join(tmpdir(), 'zernio-home-'));
    clearZernioEnv();

    try {
      const { writeConfig } = await importWithHome<typeof import('../src/utils/config.js')>(home, '../src/utils/config.js');
      const { prepareApiRequest } = await importWithHome<typeof import('../src/utils/api-request.js')>(home, '../src/utils/api-request.js');
      writeConfig({ apiKey: 'sk_saved' });

      const request = prepareApiRequest({
        baseUrl: 'https://api.zernio.com/api',
        method: 'GET',
        path: '/v1/users',
      });

      expect(request.url).toBe('https://api.zernio.com/api/v1/users');
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});

function clearZernioEnv(): void {
  delete process.env.ZERNIO_API_KEY;
  delete process.env.ZERNIO_API_URL;
  delete process.env.ZERNIO_CLI_LOAD_ENV;
  delete process.env.ZERNIO_CLI_ENV_FILE;
  delete process.env.LATE_API_KEY;
  delete process.env.LATE_API_URL;
}

async function importWithHome<T>(home: string, path: string): Promise<T> {
  vi.resetModules();
  vi.doMock('os', () => ({ homedir: () => home }));
  return import(path) as Promise<T>;
}
