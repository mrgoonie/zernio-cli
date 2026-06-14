import yargs from 'yargs/yargs';
import type { Argv } from 'yargs';
import { LateApiError } from '@zernio/node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerPostCommands } from '../src/commands/posts.js';

const mockClient = vi.hoisted(() => ({
  listAccounts: vi.fn(),
  createPost: vi.fn(),
}));

vi.mock('../src/client.js', () => ({
  createClient: vi.fn(() => ({
    accounts: { listAccounts: mockClient.listAccounts },
    posts: { createPost: mockClient.createPost },
  })),
}));

class ExitSignal extends Error {
  constructor(readonly code: string | number | null | undefined) {
    super('process.exit');
  }
}

beforeEach(() => {
  mockClient.listAccounts.mockReset();
  mockClient.createPost.mockReset();
  mockClient.listAccounts.mockResolvedValue({
    data: {
      accounts: [
        { id: 'tw_1', platform: 'twitter', username: 'zernio' },
        {
          id: 'fb_1',
          platform: 'facebook',
          username: 'mrgoon.info',
          displayName: 'MrGoon',
          status: 'healthy',
          canPost: true,
          tokenValid: true,
          needsReconnect: false,
          issues: [],
          accessToken: 'must-not-print',
        },
      ],
    },
  });
  mockClient.createPost.mockResolvedValue({ data: { id: 'post_1' } });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('posts:create command', () => {
  it('maps X thread and quote options into platformSpecificData', async () => {
    const result = await runPostCommand([
      'posts:create',
      '--text',
      'Thread display title',
      '--accounts',
      'tw_1',
      '--threadJson',
      '["tweet 1","tweet 2"]',
      '--quoteTweetId',
      '2061975910467698972',
      '--platformSpecificData',
      '{"replySettings":"following"}',
    ]);

    expect(result.exitCode).toBe(0);
    expect(mockClient.createPost).toHaveBeenCalledWith({
      body: {
        content: 'Thread display title',
        platforms: [
          {
            platform: 'twitter',
            accountId: 'tw_1',
            platformSpecificData: {
              replySettings: 'following',
              quoteTweetId: '2061975910467698972',
              threadItems: [{ content: 'tweet 1' }, { content: 'tweet 2' }],
            },
          },
        ],
        publishNow: true,
      },
    });
  });

  it('keeps existing single-post payload shape when new options are absent', async () => {
    const result = await runPostCommand([
      'posts:create',
      '--text',
      'hello',
      '--accounts',
      'fb_1',
      '--media',
      'https://cdn.example/a.png',
      '--draft',
    ]);

    expect(result.exitCode).toBe(0);
    expect(mockClient.createPost).toHaveBeenCalledWith({
      body: {
        content: 'hello',
        platforms: [{ platform: 'facebook', accountId: 'fb_1' }],
        mediaItems: [{ type: 'image', url: 'https://cdn.example/a.png' }],
        isDraft: true,
      },
    });
  });

  it('rejects X-specific options for non-X accounts before calling createPost', async () => {
    const result = await runPostCommand([
      'posts:create',
      '--text',
      'wrong platform',
      '--accounts',
      'fb_1',
      '--threadJson',
      '["tweet 1"]',
    ]);
    const payload = JSON.parse(result.stderr[0]);

    expect(result.exitCode).toBe(1);
    expect(mockClient.createPost).not.toHaveBeenCalled();
    expect(payload).toMatchObject({
      ok: false,
      status: 400,
      code: 'TWITTER_PLATFORM_DATA_REQUIRES_TWITTER',
    });
  });

  it('prints safe diagnostics for 401 post creation failures', async () => {
    mockClient.createPost.mockRejectedValueOnce(new LateApiError('Unauthorized', 401));

    const result = await runPostCommand([
      'posts:create',
      '--text',
      'draft',
      '--accounts',
      'fb_1',
      '--draft',
      '--debug-safe',
    ]);
    const payload = JSON.parse(result.stderr[0]);

    expect(result.exitCode).toBe(1);
    expect(payload).toMatchObject({
      ok: false,
      status: 401,
      code: 'POST_CREATE_UNAUTHORIZED',
      diagnostic: {
        command: 'posts:create',
        targetAccounts: [
          {
            accountId: 'fb_1',
            platform: 'facebook',
            username: 'mrgoon.info',
            displayName: 'MrGoon',
            status: 'healthy',
            canPost: true,
            tokenValid: true,
            needsReconnect: false,
            issues: [],
          },
        ],
      },
    });
    expect(JSON.stringify(payload)).not.toContain('must-not-print');
  });
});

async function runPostCommand(args: string[]): Promise<{ stdout: string[]; stderr: string[]; exitCode: number }> {
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
    const parser = registerPostCommands(
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
  }
}
