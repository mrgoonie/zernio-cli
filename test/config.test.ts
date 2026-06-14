import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const oldEnv = { ...process.env };

afterEach(() => {
  process.env = { ...oldEnv };
  vi.resetModules();
  vi.doUnmock('os');
});

describe('resolveConfig', () => {
  it('reports secret source without returning secret diagnostics', async () => {
    vi.resetModules();
    process.env.ZERNIO_API_KEY = 'sk_test_secret';
    process.env.ZERNIO_API_URL = 'https://example.test/api';

    const { resolveConfig } = await import('../src/utils/config.js');
    const resolved = resolveConfig();

    expect(resolved.config.apiKey).toBe('sk_test_secret');
    expect(resolved.sources.apiKey).toBe('env:ZERNIO_API_KEY');
    expect(resolved.config.baseUrl).toBe('https://example.test/api');
  });

  it('does not load dotenv files unless explicitly enabled', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'zernio-env-'));
    const envFile = join(dir, '.env');
    const home = join(dir, 'home');
    mkdirSync(home);
    writeFileSync(envFile, 'ZERNIO_API_KEY=sk_from_file\n', 'utf8');
    clearZernioEnv();
    process.env.ZERNIO_CLI_ENV_FILE = envFile;

    try {
      const { resolveConfig } = await importConfigWithHome(home);
      expect(resolveConfig().config.apiKey).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('loads a dotenv file only with explicit opt-in', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'zernio-env-'));
    const envFile = join(dir, '.env');
    const home = join(dir, 'home');
    mkdirSync(home);
    writeFileSync(envFile, 'ZERNIO_API_KEY=sk_from_file\nZERNIO_API_URL=https://zernio.com/api\n', 'utf8');
    clearZernioEnv();
    process.env.ZERNIO_CLI_LOAD_ENV = '1';
    process.env.ZERNIO_CLI_ENV_FILE = envFile;

    try {
      const { resolveConfig } = await importConfigWithHome(home);
      const resolved = resolveConfig();

      expect(resolved.config.apiKey).toBe('sk_from_file');
      expect(resolved.sources.apiKey).toBe('env:ZERNIO_API_KEY');
      expect(resolved.config.baseUrl).toBe('https://zernio.com/api');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('falls back to legacy config when zernio config is absent', async () => {
    const home = mkdtempSync(join(tmpdir(), 'zernio-home-'));
    clearZernioEnv();
    mkdirSync(join(home, '.late'), { recursive: true });
    writeFileSync(join(home, '.late', 'config.json'), JSON.stringify({ apiKey: 'sk_legacy' }), 'utf8');

    try {
      const { resolveConfig } = await importConfigWithHome(home);
      const resolved = resolveConfig();

      expect(resolved.config.apiKey).toBe('sk_legacy');
      expect(resolved.sources.apiKey).toBe('config-file');
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('writes config with private permissions', async () => {
    const home = mkdtempSync(join(tmpdir(), 'zernio-home-'));
    clearZernioEnv();

    try {
      const { writeConfig, resolveConfig } = await importConfigWithHome(home);
      writeConfig({ apiKey: 'sk_saved', baseUrl: 'https://zernio.com/api' });

      const dirMode = statSync(join(home, '.zernio')).mode & 0o777;
      const fileMode = statSync(join(home, '.zernio', 'config.json')).mode & 0o777;

      expect(dirMode).toBe(0o700);
      expect(fileMode).toBe(0o600);
      expect(JSON.parse(readFileSync(join(home, '.zernio', 'config.json'), 'utf8'))).toEqual({
        apiKey: 'sk_saved',
        baseUrl: 'https://zernio.com/api',
      });
      expect(resolveConfig().sources.apiKey).toBe('config-file');
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('ignores unreadable or invalid JSON config files', async () => {
    const home = mkdtempSync(join(tmpdir(), 'zernio-home-'));
    clearZernioEnv();
    mkdirSync(join(home, '.zernio'), { recursive: true });
    writeFileSync(join(home, '.zernio', 'config.json'), '{not-json', 'utf8');

    try {
      const { resolveConfig } = await importConfigWithHome(home);

      expect(resolveConfig()).toEqual({
        config: {
          apiKey: undefined,
          baseUrl: undefined,
        },
        sources: {},
      });
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('updates existing config directories and exposes getConfig', async () => {
    const home = mkdtempSync(join(tmpdir(), 'zernio-home-'));
    clearZernioEnv();
    mkdirSync(join(home, '.zernio'), { recursive: true, mode: 0o755 });

    try {
      const { getConfig, writeConfig } = await importConfigWithHome(home);
      writeConfig({ apiKey: 'sk_saved' });

      expect((statSync(join(home, '.zernio')).mode & 0o777)).toBe(0o700);
      expect(getConfig()).toEqual({ apiKey: 'sk_saved', baseUrl: undefined });
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('prints structured errors when an API key is required but missing', async () => {
    const home = mkdtempSync(join(tmpdir(), 'zernio-home-'));
    clearZernioEnv();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(process, 'exit').mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    }) as typeof process.exit);

    try {
      const { requireApiKey } = await importConfigWithHome(home);

      expect(() => requireApiKey()).toThrow('exit:1');
      expect(JSON.parse(String(error.mock.calls[0][0]))).toMatchObject({
        ok: false,
        error: true,
        message: expect.stringContaining('No API key configured'),
      });
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

async function importConfigWithHome(home: string): Promise<typeof import('../src/utils/config.js')> {
  vi.resetModules();
  vi.doMock('os', () => ({ homedir: () => home }));
  return import('../src/utils/config.js');
}
