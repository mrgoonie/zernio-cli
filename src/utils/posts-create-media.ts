import { PostsCreateValidationError } from './posts-create-validation-error.js';
import { buildMediaItems, type MediaItem } from './posts-create-platform-data.js';

/** Parse the `--media-json` flag: a JSON array of richer MediaItem objects. */
export function parseMediaJson(input?: unknown): MediaItem[] | undefined {
  if (input === undefined || input === null) return undefined;
  const raw = String(input).trim();
  if (!raw) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new PostsCreateValidationError(
      `--media-json must contain valid JSON: ${(error as Error).message}`,
      'INVALID_MEDIA_JSON',
    );
  }
  if (!Array.isArray(parsed)) {
    throw new PostsCreateValidationError('--media-json must be a JSON array of media items.', 'INVALID_MEDIA_JSON');
  }
  return parsed.map((item, index) => normalizeMediaItem(item, index));
}

/**
 * Choose between rich `--media-json` and the legacy CSV `--media`.
 * The JSON form wins whenever both are provided.
 */
export function resolveMediaItems(options: { mediaCsv?: unknown; mediaJson?: unknown }): MediaItem[] | undefined {
  const jsonItems = parseMediaJson(options.mediaJson);
  if (jsonItems && jsonItems.length) return jsonItems;
  return buildMediaItems(options.mediaCsv);
}

function normalizeMediaItem(value: unknown, index: number): MediaItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new PostsCreateValidationError(
      `--media-json[${index}] must be an object with at least { url, type }.`,
      'INVALID_MEDIA_JSON_ITEM',
    );
  }
  const item = value as Record<string, unknown>;
  const url = typeof item.url === 'string' ? item.url.trim() : '';
  if (!url) {
    throw new PostsCreateValidationError(
      `--media-json[${index}] requires a non-empty "url" string.`,
      'INVALID_MEDIA_JSON_URL',
    );
  }
  const type = typeof item.type === 'string' && item.type.trim() ? item.type.trim() : inferMediaType(url);
  return { ...(item as MediaItem), type: type as MediaItem['type'], url };
}

function inferMediaType(url: string): MediaItem['type'] {
  return /\.(mp4|mov|avi|webm|m4v)$/i.test(url) ? 'video' : 'image';
}
