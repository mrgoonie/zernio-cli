import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildMediaItems,
  buildTwitterPlatformSpecificData,
  validateTwitterPlatformSpecificData,
} from '../src/utils/posts-create-platform-data.js';

describe('posts:create platform-specific data helpers', () => {
  it('builds Twitter quote, reply, reply settings, and thread items', () => {
    const result = buildTwitterPlatformSpecificData({
      quoteTweetId: 'https://x.com/zernio/status/2061975910467698972',
      replySettings: 'following',
      platformSpecificData: '{"customFlag":true}',
      threadJson: '["tweet 1",{"content":"tweet 2","mediaItems":[{"type":"image","url":"https://cdn.example/two.png"}]}]',
    });

    expect(result).toEqual({
      hasData: true,
      data: {
        customFlag: true,
        quoteTweetId: 'https://x.com/zernio/status/2061975910467698972',
        replySettings: 'following',
        threadItems: [
          { content: 'tweet 1' },
          { content: 'tweet 2', mediaItems: [{ type: 'image', url: 'https://cdn.example/two.png' }] },
        ],
      },
    });
  });

  it('parses separator-based thread files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'zernio-thread-'));
    const filePath = join(dir, 'thread.txt');
    writeFileSync(filePath, 'tweet 1\n---\ntweet 2\nline 2\n---\ntweet 3\n', 'utf8');

    try {
      expect(buildTwitterPlatformSpecificData({ threadFile: filePath }).data).toEqual({
        threadItems: [
          { content: 'tweet 1' },
          { content: 'tweet 2\nline 2' },
          { content: 'tweet 3' },
        ],
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('builds top-level media items without changing legacy shape', () => {
    expect(buildMediaItems('https://cdn.example/a.png,https://cdn.example/b.mp4')).toEqual([
      { type: 'image', url: 'https://cdn.example/a.png' },
      { type: 'video', url: 'https://cdn.example/b.mp4' },
    ]);
  });

  it('rejects X-only options on non-X targets and conflicting API fields', () => {
    expect(() =>
      validateTwitterPlatformSpecificData(
        { hasData: true, data: { threadItems: [{ content: 'tweet' }] } },
        [{ platform: 'facebook', accountId: 'fb_1' }],
      ),
    ).toThrow('X/Twitter-specific options require only twitter/x accounts');

    expect(() =>
      validateTwitterPlatformSpecificData(
        { hasData: true, data: { quoteTweetId: '123' } },
        [{ platform: 'twitter', accountId: 'tw_1' }],
        [{ type: 'image', url: 'https://cdn.example/a.png' }],
      ),
    ).toThrow('quoteTweetId cannot be combined with --media');

    expect(() =>
      validateTwitterPlatformSpecificData(
        { hasData: true, data: { replyToTweetId: '123', replySettings: 'following' } },
        [{ platform: 'twitter', accountId: 'tw_1' }],
      ),
    ).toThrow('replyToTweetId cannot be combined with replySettings');

    expect(() =>
      validateTwitterPlatformSpecificData(
        { hasData: true, data: { quoteTweetId: '123', poll: { options: ['a', 'b'] } } },
        [{ platform: 'twitter', accountId: 'tw_1' }],
      ),
    ).toThrow('quoteTweetId cannot be combined with poll');

    expect(() =>
      validateTwitterPlatformSpecificData(
        { hasData: true, data: { poll: { options: ['a', 'b'] } } },
        [{ platform: 'twitter', accountId: 'tw_1' }],
        [{ type: 'image', url: 'https://cdn.example/a.png' }],
      ),
    ).toThrow('poll cannot be combined with --media');
  });
});
