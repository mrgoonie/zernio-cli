import type { Argv } from 'yargs';
import { createClient } from '../client.js';
import { output } from '../utils/output.js';
import { handleError } from '../utils/errors.js';
import { registerPostCreateCommand } from './posts-create.js';

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
          .option('hashtags', { type: 'string', describe: 'Comma-separated hashtags (replaces existing)' }),
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
          .option('madeForKids', { type: 'boolean', describe: 'Made for kids' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, unknown> = { platform: argv.platform };
          for (const k of ['title', 'description', 'categoryId', 'privacyStatus', 'thumbnailUrl', 'playlistId', 'videoId', 'accountId'] as const) {
            if (argv[k] !== undefined) body[k] = argv[k];
          }
          if (argv.madeForKids !== undefined) body.madeForKids = argv.madeForKids;
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
      'Bulk create posts from a JSON file',
      (y) =>
        y
          .option('file', { type: 'string', describe: 'Path to JSON file with posts array', demandOption: true })
          .option('dryRun', { type: 'boolean', describe: 'Validate without creating' }),
      async (argv) => {
        try {
          const { readFileSync } = await import('fs');
          const raw = readFileSync(argv.file!, 'utf-8');
          const body = JSON.parse(raw);
          const late = createClient();
          const query: Record<string, unknown> = {};
          if (argv.dryRun !== undefined) query.dryRun = argv.dryRun;
          const { data } = await late.posts.bulkUploadPosts({ body: body as any, query: query as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    );
}
