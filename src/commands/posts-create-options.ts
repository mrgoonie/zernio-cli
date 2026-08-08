import type { Argv } from 'yargs';

/**
 * Registers every yargs option for `posts:create`. Split out of the command
 * module so the command file stays under the modularization guideline and the
 * option surface is easy to audit against upstream/SDK docs.
 */
export function registerPostCreateOptions<T>(y: Argv<T>): Argv {
  return y
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
    .option('threadJson', {
      type: 'string',
      alias: 'threadItems',
      describe: 'X/Twitter threadItems as a JSON array (alias: --threadItems)',
    })
    .option('threadFile', { type: 'string', describe: 'X/Twitter thread file, JSON array or --- separated text' })
    .option('platformSpecificData', {
      type: 'string',
      describe: 'Advanced platformSpecificData JSON object for X/Twitter targets',
    })
    .option('paidPartnership', {
      type: 'boolean',
      describe: 'X/Twitter: mark the post as a paid partnership',
      default: false,
    })
    .option('sensitiveMedia', {
      type: 'boolean',
      describe: 'X/Twitter: flag attached media as sensitive (maps to sensitiveMedia.other)',
      default: false,
    })
    .option('aiGenerated', {
      type: 'boolean',
      describe: 'Instagram: mark the post as containing AI-generated media',
      default: false,
    })
    .option('platform-data', {
      type: 'string',
      describe:
        'JSON object keyed by platform (e.g. {"reddit":{...},"tiktok":{...}}) merged into each matching target',
    })
    .option('media-json', {
      type: 'string',
      describe:
        'JSON array of media items (supports type gif/document, altText, title, thumbnail, instagramThumbnail); wins over --media',
    })
    .option('queuedFromProfile', {
      type: 'string',
      describe: 'Profile ID to schedule via queue (auto-assigns next slot when --scheduledAt is omitted)',
    })
    .option('queueId', {
      type: 'string',
      describe: 'Specific queue ID within --queuedFromProfile (defaults to the profile queue)',
    })
    .option('recycling', { type: 'string', describe: 'JSON RecyclingConfig for recurring re-publishing' })
    .option('crosspostingEnabled', { type: 'boolean', describe: 'Enable server-side crossposting' })
    .option('mentions', { type: 'string', describe: 'JSON array of mentions (reference only; see docs)' })
    .option('metadata', { type: 'string', describe: 'JSON metadata object attached to the post' })
    .option('debug-safe', {
      type: 'boolean',
      describe: 'Include non-secret post/account diagnostics when create fails',
      default: false,
    });
}
