import yargs from 'yargs/yargs';
import type { Argv } from 'yargs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerApiCommands } from '../src/commands/api.js';
import { registerDoctorCommand } from '../src/commands/doctor.js';
import { registerPlatformCommands } from '../src/commands/platforms.js';

type RegisterCommand = (parser: Argv) => Argv;

class ExitSignal extends Error {
  constructor(readonly code: string | number | null | undefined) {
    super('process.exit');
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('command registration', () => {
  it('lists supported platforms', async () => {
    const result = await runCommand(registerPlatformCommands, ['platforms:list']);
    const payload = JSON.parse(result.stdout[0]);

    expect(result.exitCode).toBe(0);
    expect(payload.platforms).toContain('twitter');
    expect(payload.source).toBe('https://docs.zernio.com/platforms');
  });

  it('searches the OpenAPI catalog', async () => {
    const result = await runCommand(registerApiCommands, ['api:catalog', '--tag', 'Posts', '--search', 'retry', '--limit', '5']);
    const payload = JSON.parse(result.stdout[0]);

    expect(result.exitCode).toBe(0);
    expect(payload.operationCount).toBe(383);
    expect(payload.endpoints.map((endpoint: { operationId: string }) => endpoint.operationId)).toContain('retryPost');
  });

  it('describes endpoints and reports unknown operations', async () => {
    const describe = await runCommand(registerApiCommands, ['api:describe', 'listPosts']);
    expect(JSON.parse(describe.stdout[0])).toMatchObject({
      operationId: 'listPosts',
      method: 'GET',
      path: '/v1/posts',
    });

    const missing = await runCommand(registerApiCommands, ['api:describe', 'missingOperation']);
    expect(missing.exitCode).toBe(1);
    expect(JSON.parse(missing.stderr[0])).toMatchObject({
      ok: false,
      status: 404,
      message: 'Endpoint not found: missingOperation',
    });
  });

  it('dry-runs generic API calls with redacted headers', async () => {
    const result = await runCommand(registerApiCommands, [
      'api:call',
      'createPost',
      '--body-json',
      '{"content":"hello"}',
      '--request-id',
      'req_123',
      '--api-key',
      'sk_secret',
      '--dry-run',
    ]);
    const payload = JSON.parse(result.stdout[0]);

    expect(result.exitCode).toBe(0);
    expect(payload.request).toMatchObject({
      hasAuthorization: true,
      hasBody: true,
      headers: {
        authorization: '<redacted>',
        'x-request-id': '<redacted>',
      },
    });
    expect(result.stdout.join('\n')).not.toContain('sk_secret');
    expect(result.stdout.join('\n')).not.toContain('req_123');
  });

  it('reports unknown api:call operations with suggestions field', async () => {
    const result = await runCommand(registerApiCommands, ['api:call', 'notRealOperation']);
    const payload = JSON.parse(result.stderr[0]);

    expect(result.exitCode).toBe(1);
    expect(payload).toMatchObject({
      ok: false,
      status: 404,
      suggestions: [],
    });
  });

  it('reports doctor diagnostics and exits on failed connection', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    })));

    const result = await runCommand(registerDoctorCommand, ['doctor', '--connection'], {
      ZERNIO_API_KEY: 'sk_invalid',
    });
    const payload = JSON.parse(result.stdout[0]);

    expect(result.exitCode).toBe(1);
    expect(payload.config.apiKey).toEqual({
      resolved: true,
      source: 'env:ZERNIO_API_KEY',
    });
    expect(payload.connection).toMatchObject({
      ok: false,
      status: 401,
    });
  });

  it('reports successful doctor connection checks', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'x-ratelimit-limit': '600',
      },
    })));

    const result = await runCommand(registerDoctorCommand, ['doctor', '--connection'], {
      ZERNIO_API_KEY: 'sk_valid',
    });
    const payload = JSON.parse(result.stdout[0]);

    expect(result.exitCode).toBe(0);
    expect(payload.connection).toMatchObject({
      ok: true,
      status: 200,
      rateLimit: { limit: '600' },
    });
  });
});

async function runCommand(
  register: RegisterCommand,
  args: string[],
  env: Record<string, string> = {},
): Promise<{ stdout: string[]; stderr: string[]; exitCode: number }> {
  const oldEnv = { ...process.env };
  process.env = {
    ...oldEnv,
    ZERNIO_CLI_LOAD_ENV: '0',
    ...env,
  };
  const stdout: string[] = [];
  const stderr: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
    stdout.push(String(message));
  });
  vi.spyOn(console, 'error').mockImplementation((message?: unknown) => {
    stderr.push(String(message));
  });
  vi.spyOn(process, 'exit').mockImplementation(((code?: string | number | null) => {
    throw new ExitSignal(code);
  }) as typeof process.exit);

  try {
    const parser = register(
      yargs(args)
        .scriptName('zernio')
        .option('pretty', { type: 'boolean', default: false, global: true })
        .exitProcess(false)
        .fail((message, error) => {
          throw error || new Error(message);
        }) as Argv,
    );

    await parser.parseAsync();
    return { stdout, stderr, exitCode: 0 };
  } catch (error) {
    if (error instanceof ExitSignal) {
      return { stdout, stderr, exitCode: Number(error.code ?? 0) };
    }
    throw error;
  } finally {
    process.env = oldEnv;
  }
}
