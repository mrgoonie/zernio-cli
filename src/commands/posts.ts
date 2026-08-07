import type { Argv } from 'yargs';
import { createClient } from '../client.js';
import { output, outputError } from '../utils/output.js';
import { handleError } from '../utils/errors.js';
import { registerPostCreateCommand } from './posts-create.js';

/** Parse a JSON-string CLI flag, exiting with a structured 400 error on invalid JSON. */
function parseJsonFlag(raw: string, flag: string, hint: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    outputError(`--${flag} must be valid JSON (${hint})`, 400);
  }
}

/** Register post commands: posts:create, posts:list, posts:get, posts:delete, posts:retry */
export function registerPostCommands(yargs: Argv): Argv {
  return registerPostCreateCommand(yargs)
    .command(
      'posts:list',
      'List posts',
      (y) =>
        y
          .option('profileId', { type: 'string', describe: 'Filter by profile ID' })
          .option('status', { type: 'string', describe: 'Filter by status (scheduled, published, failed, draft)' })
          .option('platform', { type: 'string', describe: 'Filter by platform' })
          .option('from', { type: 'string', describe: 'Start date (ISO 8601)' })
          .option('to', { type: 'string', describe: 'End date (ISO 8601)' })
          .option('page', { type: 'number', describe: 'Page number', default: 1 })
          .option('limit', { type: 'number', describe: 'Results per page', default: 10 }),
      async (argv) => {
        try {
          const late = createClient();
          const query: Record<string, any> = {
            page: argv.page,
            limit: argv.limit,
          };
          if (argv.profileId) query.profileId = argv.profileId;
          if (argv.status) query.status = argv.status;
          if (argv.platform) query.platform = argv.platform;
          if (argv.from) query.dateFrom = argv.from;
          if (argv.to) query.dateTo = argv.to;

          const { data } = await late.posts.listPosts({ query });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'posts:get <id>',
      'Get post details',
      (y) => y.positional('id', { type: 'string', describe: 'Post ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.posts.getPost({ path: { postId: argv.id! } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'posts:delete <id>',
      'Delete a post',
      (y) => y.positional('id', { type: 'string', describe: 'Post ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.posts.deletePost({ path: { postId: argv.id! } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'posts:retry <id>',
      'Retry a failed post',
      (y) => y.positional('id', { type: 'string', describe: 'Post ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.posts.retryPost({ path: { postId: argv.id! } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'posts:update <id>',
      'Update a post (scheduled/draft posts)',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Post ID', demandOption: true })
          .option('content', { type: 'string', describe: 'New content text' })
          .option('title', { type: 'string', describe: 'New title' })
          .option('scheduledAt', { type: 'string', describe: 'ISO 8601 date to (re)schedule' })
          .option('publishNow', { type: 'boolean', describe: 'Publish immediately' })
          .option('draft', { type: 'boolean', describe: 'Mark as draft' })
          .option('timezone', { type: 'string', describe: 'Timezone' })
          .option('visibility', { type: 'string', describe: 'Visibility' })
          .option('tags', { type: 'string', describe: 'Comma-separated tags (replaces existing)' })
          .option('hashtags', { type: 'string', describe: 'Comma-separated hashtags (replaces existing)' })
          .option('recycling', { type: 'string', describe: 'JSON RecyclingConfig' })
          .option('tiktokSettings', { type: 'string', describe: 'JSON root-level TikTok settings (merged into TikTok targets)' })
          .option('facebookSettings', { type: 'string', describe: 'JSON root-level Facebook settings (merged into Facebook targets)' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, unknown> = {};
          if (argv.content !== undefined) body.content = argv.content;
          if (argv.title !== undefined) body.title = argv.title;
          if (argv.scheduledAt !== undefined) body.scheduledFor = argv.scheduledAt;
          if (argv.publishNow !== undefined) body.publishNow = argv.publishNow;
          if (argv.draft !== undefined) body.isDraft = argv.draft;
          if (argv.timezone !== undefined) body.timezone = argv.timezone;
          if (argv.visibility !== undefined) body.visibility = argv.visibility;
          if (argv.tags !== undefined) body.tags = argv.tags.split(',').map((s: string) => s.trim()).filter(Boolean);
          if (argv.hashtags !== undefined) body.hashtags = argv.hashtags.split(',').map((s: string) => s.trim()).filter(Boolean);
          if (argv.recycling) body.recycling = parseJsonFlag(argv.recycling as string, 'recycling', 'object');
          if (argv.tiktokSettings) body.tiktokSettings = parseJsonFlag(argv.tiktokSettings as string, 'tiktokSettings', 'object');
          if (argv.facebookSettings) body.facebookSettings = parseJsonFlag(argv.facebookSettings as string, 'facebookSettings', 'object');
          const { data } = await late.posts.updatePost({ path: { postId: argv.id! }, body: body as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'posts:edit <id>',
      'Edit an already-published post on a platform (where supported)',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Post ID', demandOption: true })
          .option('platform', { type: 'string', describe: 'Platform to edit on', demandOption: true })
          .option('content', { type: 'string', describe: 'New content', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.posts.editPost({ path: { postId: argv.id! }, body: { platform: argv.platform, content: argv.content } as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'posts:unpublish <id>',
      'Unpublish (remove) a published post from a platform',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Post ID', demandOption: true })
          .option('platform', { type: 'string', describe: 'Platform to unpublish from', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.posts.unpublishPost({ path: { postId: argv.id! }, body: { platform: argv.platform } as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'posts:update-metadata <id>',
      'Update platform metadata for a published post (e.g. YouTube title/tags)',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Post ID', demandOption: true })
          .option('platform', { type: 'string', describe: 'Platform', demandOption: true })
          .option('title', { type: 'string', describe: 'New title' })
          .option('description', { type: 'string', describe: 'New description' })
          .option('tags', { type: 'string', describe: 'Comma-separated tags' })
          .option('categoryId', { type: 'string', describe: 'Category ID' })
          .option('privacyStatus', { type: 'string', describe: 'Privacy status' })
          .option('thumbnailUrl', { type: 'string', describe: 'Thumbnail URL' })
          .option('playlistId', { type: 'string', describe: 'Playlist ID' })
          .option('videoId', { type: 'string', describe: 'Platform video ID' })
          .option('accountId', { type: 'string', describe: 'Account ID' })
          .option('madeForKids', { type: 'boolean', describe: 'Made for kids' })
          .option('containsSyntheticMedia', { type: 'boolean', describe: 'YouTube AI-content disclosure (synthetic media that could be mistaken for real)' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, unknown> = { platform: argv.platform };
          for (const k of ['title', 'description', 'categoryId', 'privacyStatus', 'thumbnailUrl', 'playlistId', 'videoId', 'accountId'] as const) {
            if (argv[k] !== undefined) body[k] = argv[k];
          }
          if (argv.madeForKids !== undefined) body.madeForKids = argv.madeForKids;
          if (argv.containsSyntheticMedia !== undefined) body.containsSyntheticMedia = argv.containsSyntheticMedia;
          if (argv.tags !== undefined) body.tags = argv.tags.split(',').map((s: string) => s.trim()).filter(Boolean);
          const { data } = await late.posts.updatePostMetadata({ path: { postId: argv.id! }, body: body as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'posts:bulk-upload',
      'Bulk create posts from a file (uploaded as multipart)',
      (y) =>
        y
          .option('file', { type: 'string', describe: 'Path to the bulk-upload file', demandOption: true })
          .option('dryRun', { type: 'boolean', describe: 'Validate without creating' }),
      async (argv) => {
        try {
          const { readFileSync, statSync } = await import('fs');
          const { basename } = await import('path');
          let stat;
          try {
            stat = statSync(argv.file!);
          } catch {
            outputError(`File not found: ${argv.file}`, 404);
          }
          if (!stat!.isFile()) {
            outputError(`Not a file: ${argv.file}`, 400);
          }
          // The API expects a multipart file upload, not a JSON body.
          const buffer = readFileSync(argv.file!);
          const filename = basename(argv.file!);
          // `File` is Node 20+; fall back to `Blob` (Node 18+) so bulk-upload still
          // works on Node 18 runtimes. The SDK accepts either (Blob | File).
          const file =
            typeof File !== 'undefined'
              ? new File([buffer], filename, { type: 'text/csv' })
              : new Blob([buffer], { type: 'text/csv' });
          const late = createClient();
          const query: Record<string, unknown> = {};
          if (argv.dryRun !== undefined) query.dryRun = argv.dryRun;
          const { data } = await late.posts.bulkUploadPosts({ body: { file }, query: query as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    );
}
