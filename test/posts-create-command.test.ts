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

  it('accepts --threadItems as an alias for --threadJson', async () => {
    const result = await runPostCommand([
      'posts:create',
      '--text',
      'thread via alias',
      '--accounts',
      'tw_1',
      '--threadItems',
      '["tweet 1","tweet 2"]',
    ]);

    expect(result.exitCode).toBe(0);
    const call = mockClient.createPost.mock.calls[0][0].body;
    expect(call.platforms[0].platformSpecificData).toEqual({
      threadItems: [{ content: 'tweet 1' }, { content: 'tweet 2' }],
    });
    expect(call.publishNow).toBe(true);
  });

  it('maps --paidPartnership, --sensitiveMedia, and --media into X platformSpecificData', async () => {
    const result = await runPostCommand([
      'posts:create',
      '--text',
      'labeled',
      '--accounts',
      'tw_1',
      '--paidPartnership',
      '--sensitiveMedia',
      '--media',
      'https://cdn.example/a.png',
    ]);

    expect(result.exitCode).toBe(0);
    const body = mockClient.createPost.mock.calls[0][0].body;
    expect(body.platforms[0].platformSpecificData).toEqual({
      paidPartnership: true,
      sensitiveMedia: { other: true },
    });
    expect(body.mediaItems).toEqual([{ type: 'image', url: 'https://cdn.example/a.png' }]);
  });

  it('merges --platform-data into non-X targets and lets --media-json win over --media', async () => {
    const result = await runPostCommand([
      'posts:create',
      '--text',
      'generic passthrough',
      '--accounts',
      'fb_1',
      '--platform-data',
      '{"facebook":{"link":"https://example.com"}}',
      '--media',
      'https://cdn.example/legacy.png',
      '--media-json',
      '[{"type":"document","url":"https://cdn.example/doc.pdf","title":"whitepaper"}]',
    ]);

    expect(result.exitCode).toBe(0);
    const body = mockClient.createPost.mock.calls[0][0].body;
    expect(body.platforms[0]).toEqual({
      platform: 'facebook',
      accountId: 'fb_1',
      platformSpecificData: { link: 'https://example.com' },
    });
    expect(body.mediaItems).toEqual([{ type: 'document', url: 'https://cdn.example/doc.pdf', title: 'whitepaper' }]);
  });

  it('passes queue, recycling, crossposting, mentions, and metadata through to body', async () => {
    const result = await runPostCommand([
      'posts:create',
      '--text',
      'queued',
      '--accounts',
      'fb_1',
      '--queuedFromProfile',
      'prof_1',
      '--queueId',
      'queue_1',
      '--recycling',
      '{"enabled":true,"interval":"weekly","intervalCount":1}',
      '--crosspostingEnabled',
      '--mentions',
      '["@brand"]',
      '--metadata',
      '{"source":"api"}',
    ]);

    expect(result.exitCode).toBe(0);
    const body = mockClient.createPost.mock.calls[0][0].body;
    expect(body).toMatchObject({
      queuedFromProfile: 'prof_1',
      queueId: 'queue_1',
      recycling: { enabled: true, interval: 'weekly', intervalCount: 1 },
      crosspostingEnabled: true,
      mentions: ['@brand'],
      metadata: { source: 'api' },
    });
    // queue implies publishNow is NOT set (server assigns slot)
    expect(body.publishNow).toBeUndefined();
    expect(body.scheduledFor).toBeUndefined();
  });

  it('still honors --scheduledAt when combined with --queuedFromProfile', async () => {
    const result = await runPostCommand([
      'posts:create',
      '--text',
      'scheduled',
      '--accounts',
      'fb_1',
      '--queuedFromProfile',
      'prof_1',
      '--scheduledAt',
      '2030-01-02T03:04:05Z',
    ]);

    expect(result.exitCode).toBe(0);
    const body = mockClient.createPost.mock.calls[0][0].body;
    expect(body.scheduledFor).toBe('2030-01-02T03:04:05Z');
    expect(body.queuedFromProfile).toBe('prof_1');
    expect(body.publishNow).toBeUndefined();
  });

  it('rejects --queueId when --queuedFromProfile is missing', async () => {
    const result = await runPostCommand([
      'posts:create',
      '--text',
      'invalid queue',
      '--accounts',
      'fb_1',
      '--queueId',
      'queue_1',
    ]);
    const payload = JSON.parse(result.stderr[0]);

    expect(result.exitCode).toBe(1);
    expect(mockClient.createPost).not.toHaveBeenCalled();
    expect(payload).toMatchObject({ ok: false, code: 'QUEUE_ID_REQUIRES_QUEUED_FROM_PROFILE' });
  });

  it('rejects invalid JSON for --metadata with a structured error', async () => {
    const result = await runPostCommand([
      'posts:create',
      '--text',
      'bad metadata',
      '--accounts',
      'fb_1',
      '--metadata',
      '{not json',
    ]);
    const payload = JSON.parse(result.stderr[0]);

    expect(result.exitCode).toBe(1);
    expect(mockClient.createPost).not.toHaveBeenCalled();
    expect(payload).toMatchObject({ ok: false, code: 'INVALID_JSON' });
    expect(payload.message).toContain('--metadata');
  });

  it('rejects invalid JSON for --media-json with a structured error', async () => {
    const result = await runPostCommand([
      'posts:create',
      '--text',
      'bad media',
      '--accounts',
      'fb_1',
      '--media-json',
      '{not json',
    ]);
    const payload = JSON.parse(result.stderr[0]);

    expect(result.exitCode).toBe(1);
    expect(mockClient.createPost).not.toHaveBeenCalled();
    expect(payload).toMatchObject({ ok: false, code: 'INVALID_MEDIA_JSON' });
  });

  it('sends crosspostingEnabled=false when --no-crosspostingEnabled is passed', async () => {
    const result = await runPostCommand([
      'posts:create',
      '--text',
      'no crosspost',
      '--accounts',
      'fb_1',
      '--no-crosspostingEnabled',
    ]);

    expect(result.exitCode).toBe(0);
    const body = mockClient.createPost.mock.calls[0][0].body;
    expect(body.crosspostingEnabled).toBe(false);
  });

  it('strips queue fields and omits publishNow when --draft is combined with --queuedFromProfile', async () => {
    const result = await runPostCommand([
      'posts:create',
      '--text',
      'draft over queue',
      '--accounts',
      'fb_1',
      '--draft',
      '--queuedFromProfile',
      'prof_1',
      '--queueId',
      'queue_1',
    ]);

    expect(result.exitCode).toBe(0);
    const body = mockClient.createPost.mock.calls[0][0].body;
    expect(body).toMatchObject({ isDraft: true });
    expect(body.queuedFromProfile).toBeUndefined();
    expect(body.queueId).toBeUndefined();
    expect(body.publishNow).toBeUndefined();
    expect(body.scheduledFor).toBeUndefined();
  });

  it('warns (stderr) when --sensitiveMedia is set without attached media', async () => {
    const stderrChunks: string[] = [];
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk: any) => {
      stderrChunks.push(String(chunk));
      return true;
    });
    try {
      const result = await runPostCommand([
        'posts:create',
        '--text',
        'no media',
        '--accounts',
        'tw_1',
        '--sensitiveMedia',
      ]);
      expect(result.exitCode).toBe(0);
      expect(stderrChunks.join('')).toContain('--sensitiveMedia has no effect');
    } finally {
      spy.mockRestore();
    }
  });

  it('maps --aiGenerated onto Instagram targets only', async () => {
    mockClient.listAccounts.mockResolvedValueOnce({
      data: {
        accounts: [
          { id: 'ig_1', platform: 'instagram' },
          { id: 'fb_1', platform: 'facebook' },
        ],
      },
    });
    const result = await runPostCommand([
      'posts:create',
      '--text',
      'ai post',
      '--accounts',
      'ig_1,fb_1',
      '--aiGenerated',
    ]);

    expect(result.exitCode).toBe(0);
    const body = mockClient.createPost.mock.calls[0][0].body;
    expect(body.platforms).toEqual([
      { platform: 'instagram', accountId: 'ig_1', platformSpecificData: { isAiGenerated: true } },
      { platform: 'facebook', accountId: 'fb_1' },
    ]);
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
