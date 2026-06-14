import type { Argv } from 'yargs';
import { createClient } from '../client.js';
import { addAccountHealthDiagnostics, handlePostCreateError } from '../utils/posts-create-diagnostics.js';
import {
  applyTwitterPlatformSpecificData,
  buildMediaItems,
  buildTwitterPlatformSpecificData,
  PostsCreateValidationError,
  validateTwitterPlatformSpecificData,
  type PlatformTarget,
} from '../utils/posts-create-platform-data.js';
import { output, outputError } from '../utils/output.js';

export function registerPostCreateCommand(yargs: Argv): Argv {
  return yargs.command(
    'posts:create',
    'Create or schedule a post',
    (y) =>
      y
        .option('text', { type: 'string', describe: 'Post content text', demandOption: true })
        .option('accounts', { type: 'string', describe: 'Comma-separated account IDs', demandOption: true })
        .option('scheduledAt', { type: 'string', describe: 'ISO 8601 date to schedule (omit to publish now)' })
        .option('draft', { type: 'boolean', describe: 'Save as draft', default: false })
        .option('media', { type: 'string', describe: 'Comma-separated media URLs' })
        .option('title', { type: 'string', describe: 'Post title (YouTube, Reddit, etc.)' })
        .option('tags', { type: 'string', describe: 'Comma-separated tags' })
        .option('hashtags', { type: 'string', describe: 'Comma-separated hashtags' })
        .option('timezone', { type: 'string', describe: 'Timezone (e.g. America/New_York)' })
        .option('quoteTweetId', { type: 'string', describe: 'X/Twitter tweet ID or status URL to quote' })
        .option('replyToTweetId', { type: 'string', describe: 'X/Twitter tweet ID to reply to' })
        .option('replySettings', {
          type: 'string',
          describe: 'X/Twitter reply settings: following, mentionedUsers, subscribers, verified',
        })
        .option('threadJson', { type: 'string', describe: 'X/Twitter threadItems as a JSON array' })
        .option('threadFile', { type: 'string', describe: 'X/Twitter thread file, JSON array or --- separated text' })
        .option('platformSpecificData', {
          type: 'string',
          describe: 'Advanced platformSpecificData JSON object for X/Twitter targets',
        })
        .option('debug-safe', {
          type: 'boolean',
          describe: 'Include non-secret post/account diagnostics when create fails',
          default: false,
        }),
    async (argv) => {
      let platforms: PlatformTarget[] = [];
      let selectedAccounts: Record<string, unknown>[] = [];
      try {
        const late = createClient();
        const { data: accountsData } = await late.accounts.listAccounts();
        const accountIds = argv.accounts.split(',').map((s: string) => s.trim()).filter(Boolean);
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

        const mediaItems = buildMediaItems(argv.media);
        const twitterData = buildTwitterPlatformSpecificData({
          quoteTweetId: argv.quoteTweetId,
          replyToTweetId: argv.replyToTweetId,
          replySettings: argv.replySettings,
          threadJson: argv.threadJson,
          threadFile: argv.threadFile,
          platformSpecificData: argv.platformSpecificData,
        });
        validateTwitterPlatformSpecificData(twitterData, platforms, mediaItems);
        platforms = applyTwitterPlatformSpecificData(platforms, twitterData);

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
    },
  );
}

function buildCreatePostBody(
  argv: Record<string, any>,
  platforms: PlatformTarget[],
  mediaItems?: ReturnType<typeof buildMediaItems>,
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

  if (argv.draft) {
    body.isDraft = true;
  } else if (argv.scheduledAt) {
    body.scheduledFor = argv.scheduledAt;
  } else {
    body.publishNow = true;
  }
  return body;
}

function csv(value: string): string[] {
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}
