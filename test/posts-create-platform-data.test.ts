import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyGenericPlatformData,
  applyInstagramPlatformSpecificData,
  buildInstagramPlatformSpecificData,
  buildMediaItems,
  buildTwitterPlatformSpecificData,
  detectPlatformDataTwitterOverlap,
  parsePlatformDataMap,
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

  describe('content-disclosure flags', () => {
    it('sets paidPartnership when true', () => {
      expect(buildTwitterPlatformSpecificData({ paidPartnership: true })).toEqual({
        hasData: true,
        data: { paidPartnership: true },
      });
    });

    it('omits paidPartnership when false or absent', () => {
      expect(buildTwitterPlatformSpecificData({ paidPartnership: false })).toEqual({ hasData: false });
      expect(buildTwitterPlatformSpecificData({})).toEqual({ hasData: false });
    });

    it('maps sensitiveMedia flag to { other: true }', () => {
      expect(buildTwitterPlatformSpecificData({ sensitiveMedia: true })).toEqual({
        hasData: true,
        data: { sensitiveMedia: { other: true } },
      });
    });

    it('omits sensitiveMedia when false or absent', () => {
      expect(buildTwitterPlatformSpecificData({ sensitiveMedia: false })).toEqual({ hasData: false });
    });

    it('builds Instagram isAiGenerated when aiGenerated=true', () => {
      expect(buildInstagramPlatformSpecificData({ aiGenerated: true })).toEqual({
        hasData: true,
        data: { isAiGenerated: true },
      });
    });

    it('returns no data when aiGenerated is false or absent', () => {
      expect(buildInstagramPlatformSpecificData({ aiGenerated: false })).toEqual({ hasData: false });
      expect(buildInstagramPlatformSpecificData({})).toEqual({ hasData: false });
    });

    it('applies Instagram data only to instagram targets', () => {
      const platforms = [
        { platform: 'instagram', accountId: 'ig_1' },
        { platform: 'facebook', accountId: 'fb_1' },
      ];
      const result = applyInstagramPlatformSpecificData(platforms, { hasData: true, data: { isAiGenerated: true } });
      expect(result).toEqual([
        { platform: 'instagram', accountId: 'ig_1', platformSpecificData: { isAiGenerated: true } },
        { platform: 'facebook', accountId: 'fb_1' },
      ]);
    });

    it('leaves platforms untouched when Instagram result has no data', () => {
      const platforms = [{ platform: 'instagram', accountId: 'ig_1' }];
      expect(applyInstagramPlatformSpecificData(platforms, { hasData: false })).toBe(platforms);
    });
  });

  describe('generic --platform-data', () => {
    it('parses a JSON object keyed by platform', () => {
      const map = parsePlatformDataMap('{"reddit":{"subreddit":"programming"},"tiktok":{"privacy":"PUBLIC"}}');
      expect(map).toEqual({
        reddit: { subreddit: 'programming' },
        tiktok: { privacy: 'PUBLIC' },
      });
    });

    it('returns undefined when omitted or empty', () => {
      expect(parsePlatformDataMap(undefined)).toBeUndefined();
      expect(parsePlatformDataMap('')).toBeUndefined();
    });

    it('throws PostsCreateValidationError on invalid JSON', () => {
      expect(() => parsePlatformDataMap('{not json')).toThrow('--platform-data must contain valid JSON');
    });

    it('throws when the root value is not a plain object', () => {
      expect(() => parsePlatformDataMap('[1,2]')).toThrow('--platform-data must be a JSON object');
    });

    it('throws when a per-platform value is not an object', () => {
      expect(() => parsePlatformDataMap('{"reddit":"nope"}')).toThrow('--platform-data.reddit must be a JSON object');
    });

    it('merges platform data into matching targets only', () => {
      const platforms = [
        { platform: 'reddit', accountId: 'rd_1' },
        { platform: 'tiktok', accountId: 'tt_1' },
        { platform: 'facebook', accountId: 'fb_1' },
      ];
      const result = applyGenericPlatformData(platforms, {
        reddit: { subreddit: 'programming' },
        tiktok: { privacy: 'PUBLIC' },
      });
      expect(result).toEqual([
        { platform: 'reddit', accountId: 'rd_1', platformSpecificData: { subreddit: 'programming' } },
        { platform: 'tiktok', accountId: 'tt_1', platformSpecificData: { privacy: 'PUBLIC' } },
        { platform: 'facebook', accountId: 'fb_1' },
      ]);
    });

    it('preserves existing platformSpecificData and merges alongside', () => {
      const platforms = [{ platform: 'reddit', accountId: 'rd_1', platformSpecificData: { existing: true } }];
      const result = applyGenericPlatformData(platforms, { reddit: { flair: 'help' } });
      expect(result[0].platformSpecificData).toEqual({ existing: true, flair: 'help' });
    });

    it('leaves platforms untouched when the map is undefined', () => {
      const platforms = [{ platform: 'reddit', accountId: 'rd_1' }];
      expect(applyGenericPlatformData(platforms, undefined)).toBe(platforms);
    });

    describe('detectPlatformDataTwitterOverlap', () => {
      it('reports helper fields overridden by --platform-data.twitter', () => {
        const twitterData = buildTwitterPlatformSpecificData({
          quoteTweetId: '1234',
          paidPartnership: true,
        });
        const map = parsePlatformDataMap('{"twitter":{"quoteTweetId":"9999","otherField":"keep"}}');
        expect(detectPlatformDataTwitterOverlap({ platformDataMap: map, twitterData })).toEqual([
          'quoteTweetId',
        ]);
      });

      it('detects overlap through the x alias key', () => {
        const twitterData = buildTwitterPlatformSpecificData({ quoteTweetId: '1234' });
        const map = parsePlatformDataMap('{"x":{"quoteTweetId":"9999"}}');
        expect(detectPlatformDataTwitterOverlap({ platformDataMap: map, twitterData })).toEqual([
          'quoteTweetId',
        ]);
      });

      it('returns [] when platform-data.twitter fields do not collide with helpers', () => {
        const twitterData = buildTwitterPlatformSpecificData({ quoteTweetId: '1234' });
        const map = parsePlatformDataMap('{"twitter":{"conversationOwnersOnly":true}}');
        expect(detectPlatformDataTwitterOverlap({ platformDataMap: map, twitterData })).toEqual([]);
      });

      it('returns [] when only helpers are set (no --platform-data)', () => {
        const twitterData = buildTwitterPlatformSpecificData({ quoteTweetId: '1234' });
        expect(
          detectPlatformDataTwitterOverlap({ platformDataMap: undefined, twitterData }),
        ).toEqual([]);
      });

      it('returns [] when only --platform-data.twitter is set (no helpers)', () => {
        const twitterData = buildTwitterPlatformSpecificData({});
        const map = parsePlatformDataMap('{"twitter":{"quoteTweetId":"9999"}}');
        expect(detectPlatformDataTwitterOverlap({ platformDataMap: map, twitterData })).toEqual([]);
      });

      it('returns unique sorted list when helpers overlap on multiple fields via both aliases', () => {
        const twitterData = buildTwitterPlatformSpecificData({
          quoteTweetId: '1234',
          replyToTweetId: '5678',
        });
        const map = parsePlatformDataMap(
          '{"twitter":{"quoteTweetId":"9999"},"x":{"replyToTweetId":"1111","quoteTweetId":"7"}}',
        );
        expect(detectPlatformDataTwitterOverlap({ platformDataMap: map, twitterData })).toEqual([
          'quoteTweetId',
          'replyToTweetId',
        ]);
      });
    });

    it('normalizes x/twitter aliases so either spelling reaches both target names', () => {
      const map = parsePlatformDataMap('{"x":{"conversationOwnersOnly":true}}');
      expect(map).toEqual({
        x: { conversationOwnersOnly: true },
        twitter: { conversationOwnersOnly: true },
      });
      const platforms = [
        { platform: 'twitter', accountId: 'tw_1' },
        { platform: 'x', accountId: 'x_1' },
      ];
      const result = applyGenericPlatformData(platforms, map);
      expect(result[0].platformSpecificData).toEqual({ conversationOwnersOnly: true });
      expect(result[1].platformSpecificData).toEqual({ conversationOwnersOnly: true });
    });
  });
});
