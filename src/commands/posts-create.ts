import type { Argv } from 'yargs';
import { createClient } from '../client.js';
import { addAccountHealthDiagnostics, handlePostCreateError } from '../utils/posts-create-diagnostics.js';
import {
  applyGenericPlatformData,
  applyInstagramPlatformSpecificData,
  applyTwitterPlatformSpecificData,
  buildInstagramPlatformSpecificData,
  buildTwitterPlatformSpecificData,
  parsePlatformDataMap,
  PostsCreateValidationError,
  validateTwitterPlatformSpecificData,
  type MediaItem,
  type PlatformTarget,
} from '../utils/posts-create-platform-data.js';
import { resolveMediaItems } from '../utils/posts-create-media.js';
import { output, outputError, outputWarning } from '../utils/output.js';
import { registerPostCreateOptions } from './posts-create-options.js';

export function registerPostCreateCommand(yargs: Argv): Argv {
  return yargs.command('posts:create', 'Create or schedule a post', registerPostCreateOptions, async (raw) => {
    const argv = raw as Record<string, any>;
    let platforms: PlatformTarget[] = [];
    let selectedAccounts: Record<string, unknown>[] = [];
    try {
      const late = createClient();
      const { data: accountsData } = await late.accounts.listAccounts();
      const accountIds = String(argv.accounts).split(',').map((s: string) => s.trim()).filter(Boolean);
      const allAccounts = (accountsData as any)?.accounts || [];

      selectedAccounts = accountIds.map((id: string) => {
        const account = allAccounts.find((a: any) => (a._id || a.id) === id);
        if (!account) {
          throw new PostsCreateValidationError(
            `Account ${id} not found. Run "zernio accounts:list" to see available accounts.`,
            'ACCOUNT_NOT_FOUND',
            404,
          );
        }
        return account;
      });

      platforms = selectedAccounts.map((account, index) => ({
        platform: String(account.platform),
        accountId: accountIds[index],
      }));

      const mediaItems = resolveMediaItems({ mediaCsv: argv.media, mediaJson: argv.mediaJson });
      const twitterData = buildTwitterPlatformSpecificData({
        quoteTweetId: argv.quoteTweetId,
        replyToTweetId: argv.replyToTweetId,
        replySettings: argv.replySettings,
        threadJson: argv.threadJson,
        threadFile: argv.threadFile,
        platformSpecificData: argv.platformSpecificData,
        paidPartnership: argv.paidPartnership,
        sensitiveMedia: argv.sensitiveMedia,
      });
      validateTwitterPlatformSpecificData(twitterData, platforms, mediaItems);
      if (argv.sensitiveMedia && !(mediaItems && mediaItems.length)) {
        outputWarning('--sensitiveMedia has no effect without attached media; the label is ignored for text-only posts.');
      }
      platforms = applyTwitterPlatformSpecificData(platforms, twitterData);
      const instagramData = buildInstagramPlatformSpecificData({ aiGenerated: argv.aiGenerated });
      platforms = applyInstagramPlatformSpecificData(platforms, instagramData);
      platforms = applyGenericPlatformData(platforms, parsePlatformDataMap(argv.platformData));

      if (argv.debugSafe) {
        selectedAccounts = await addAccountHealthDiagnostics(late as any, accountIds, selectedAccounts);
      }

      const body = buildCreatePostBody(argv, platforms, mediaItems);
      const { data } = await late.posts.createPost({ body });
      output(data, argv.pretty as boolean);
    } catch (err) {
      if (err instanceof PostsCreateValidationError) {
        outputError(err.message, err.status, { code: err.code }, argv.pretty as boolean);
      }
      handlePostCreateError(err, {
        debugSafe: argv.debugSafe as boolean,
        pretty: argv.pretty as boolean,
        platforms,
        accounts: selectedAccounts,
      });
    }
  });
}

/** Build the createPost body, applying queue/publish semantics per the SDK contract. */
function buildCreatePostBody(
  argv: Record<string, any>,
  platforms: PlatformTarget[],
  mediaItems?: MediaItem[],
): Record<string, any> {
  const body: Record<string, any> = {
    content: argv.text,
    platforms,
  };

  if (mediaItems?.length) body.mediaItems = mediaItems;
  if (argv.title) body.title = argv.title;
  if (argv.timezone) body.timezone = argv.timezone;
  if (argv.tags) body.tags = csv(argv.tags);
  if (argv.hashtags) body.hashtags = csv(argv.hashtags);
  if (argv.mentions) body.mentions = parseJsonFlag(argv.mentions, 'mentions', 'array');
  if (argv.metadata) body.metadata = parseJsonFlag(argv.metadata, 'metadata', 'object');
  if (argv.recycling) body.recycling = parseJsonFlag(argv.recycling, 'recycling', 'object');
  if (argv.crosspostingEnabled !== undefined) body.crosspostingEnabled = argv.crosspostingEnabled;
  if (argv.queueId && !argv.queuedFromProfile) {
    throw new PostsCreateValidationError(
      '--queueId can only be used together with --queuedFromProfile.',
      'QUEUE_ID_REQUIRES_QUEUED_FROM_PROFILE',
    );
  }
  // Scheduling precedence: --draft wins; then --scheduledAt; then --queuedFromProfile
  // (server assigns the queue slot); otherwise publishNow. Draft strips queue fields to
  // avoid ambiguous server behavior when both are sent.
  if (argv.draft) {
    body.isDraft = true;
  } else {
    if (argv.queuedFromProfile) body.queuedFromProfile = argv.queuedFromProfile;
    if (argv.queueId) body.queueId = argv.queueId;
    if (argv.scheduledAt) {
      body.scheduledFor = argv.scheduledAt;
    } else if (!argv.queuedFromProfile) {
      body.publishNow = true;
    }
  }
  return body;
}

function parseJsonFlag(raw: string, flag: string, hint: 'object' | 'array'): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new PostsCreateValidationError(
      `--${flag} must contain valid JSON: ${(error as Error).message}`,
      'INVALID_JSON',
    );
  }
  if (hint === 'array' && !Array.isArray(parsed)) {
    throw new PostsCreateValidationError(`--${flag} must be a JSON array.`, 'INVALID_JSON');
  }
  if (hint === 'object' && (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed))) {
    throw new PostsCreateValidationError(`--${flag} must be a JSON object.`, 'INVALID_JSON');
  }
  return parsed;
}

function csv(value: string): string[] {
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}
