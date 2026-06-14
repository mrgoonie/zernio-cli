import { parseThreadItems } from './posts-create-thread-items.js';
import { PostsCreateValidationError } from './posts-create-validation-error.js';

export { PostsCreateValidationError } from './posts-create-validation-error.js';

export type MediaItem = { type: 'image' | 'video'; url: string; [key: string]: unknown };
export type PlatformTarget = {
  platform: string;
  accountId: string;
  platformSpecificData?: Record<string, unknown>;
};

export type TwitterPlatformSpecificDataResult = {
  hasData: boolean;
  data?: Record<string, unknown>;
};

type TwitterPlatformOptions = {
  quoteTweetId?: unknown;
  replyToTweetId?: unknown;
  replySettings?: unknown;
  threadJson?: unknown;
  threadFile?: unknown;
  platformSpecificData?: unknown;
};

const REPLY_SETTINGS = new Set(['following', 'mentionedUsers', 'subscribers', 'verified']);

export function buildMediaItems(media?: unknown): MediaItem[] | undefined {
  const urls = commaList(media);
  if (!urls.length) return undefined;
  return urls.map((url) => ({
    type: /\.(mp4|mov|avi|webm|m4v)$/i.test(url) ? 'video' : 'image',
    url,
  }));
}

export function buildTwitterPlatformSpecificData(options: TwitterPlatformOptions): TwitterPlatformSpecificDataResult {
  const data = parsePlatformSpecificData(options.platformSpecificData);
  const quoteTweetId = stringOption(options.quoteTweetId);
  const replyToTweetId = stringOption(options.replyToTweetId);
  const replySettings = stringOption(options.replySettings);

  if (quoteTweetId) data.quoteTweetId = quoteTweetId;
  if (replyToTweetId) data.replyToTweetId = replyToTweetId;
  if (replySettings) {
    if (!REPLY_SETTINGS.has(replySettings)) {
      throw new PostsCreateValidationError(
        'replySettings must be one of: following, mentionedUsers, subscribers, verified.',
        'INVALID_REPLY_SETTINGS',
      );
    }
    data.replySettings = replySettings;
  }

  const threadItems = parseThreadItems(options.threadJson, options.threadFile);
  if (threadItems) data.threadItems = threadItems;

  return Object.keys(data).length ? { hasData: true, data } : { hasData: false };
}

export function validateTwitterPlatformSpecificData(
  result: TwitterPlatformSpecificDataResult,
  platforms: PlatformTarget[],
  mediaItems: MediaItem[] = [],
): void {
  if (!result.hasData || !result.data) return;
  const invalidTargets = platforms.filter((target) => !isTwitterPlatform(target.platform));
  if (invalidTargets.length) {
    throw new PostsCreateValidationError(
      'X/Twitter-specific options require only twitter/x accounts.',
      'TWITTER_PLATFORM_DATA_REQUIRES_TWITTER',
    );
  }
  if (result.data.quoteTweetId && mediaItems.length) {
    throw new PostsCreateValidationError(
      'quoteTweetId cannot be combined with --media.',
      'TWITTER_QUOTE_REJECTS_MEDIA',
    );
  }
  if (result.data.quoteTweetId && result.data.poll) {
    throw new PostsCreateValidationError(
      'quoteTweetId cannot be combined with poll.',
      'TWITTER_QUOTE_REJECTS_POLL',
    );
  }
  if (result.data.replyToTweetId && result.data.replySettings) {
    throw new PostsCreateValidationError(
      'replyToTweetId cannot be combined with replySettings.',
      'TWITTER_REPLY_REJECTS_REPLY_SETTINGS',
    );
  }
  if (result.data.poll && mediaItems.length) {
    throw new PostsCreateValidationError('poll cannot be combined with --media.', 'TWITTER_POLL_REJECTS_MEDIA');
  }
  if (result.data.threadItems && result.data.poll) {
    throw new PostsCreateValidationError('threadItems cannot be combined with poll.', 'TWITTER_THREAD_REJECTS_POLL');
  }
}

export function applyTwitterPlatformSpecificData(
  platforms: PlatformTarget[],
  result: TwitterPlatformSpecificDataResult,
): PlatformTarget[] {
  if (!result.hasData || !result.data) return platforms;
  return platforms.map((target) => ({
    ...target,
    platformSpecificData: {
      ...(target.platformSpecificData || {}),
      ...result.data,
    },
  }));
}

function parsePlatformSpecificData(input?: unknown): Record<string, unknown> {
  const raw = stringOption(input);
  if (!raw) return {};
  const parsed = parseJson(raw, '--platformSpecificData');
  if (!isRecord(parsed) || Array.isArray(parsed)) {
    throw new PostsCreateValidationError('--platformSpecificData must be a JSON object.', 'INVALID_PLATFORM_SPECIFIC_DATA');
  }
  return { ...parsed };
}

function parseJson(raw: string, optionName: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new PostsCreateValidationError(
      `${optionName} must contain valid JSON: ${(error as Error).message}`,
      'INVALID_JSON',
    );
  }
}

function stringOption(value?: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function commaList(value?: unknown): string[] {
  const raw = stringOption(value);
  if (!raw) return [];
  return raw.split(',').map((item) => item.trim()).filter(Boolean);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTwitterPlatform(platform: string): boolean {
  return platform === 'twitter' || platform === 'x';
}
