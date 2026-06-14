import { readFileSync } from 'node:fs';
import { PostsCreateValidationError } from './posts-create-validation-error.js';

export function parseThreadItems(threadJson?: unknown, threadFile?: unknown): Record<string, unknown>[] | undefined {
  const inline = stringOption(threadJson);
  const file = stringOption(threadFile);
  if (inline && file) {
    throw new PostsCreateValidationError('Use either --threadJson or --threadFile, not both.', 'AMBIGUOUS_THREAD_INPUT');
  }
  if (inline) return normalizeThreadItems(parseJson(inline, '--threadJson'));
  if (!file) return undefined;

  const raw = readFileSync(file, 'utf8');
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) return normalizeThreadItems(parseJson(trimmed, '--threadFile'));
  return normalizeThreadItems(splitThreadFile(raw));
}

function normalizeThreadItems(input: unknown): Record<string, unknown>[] {
  if (!Array.isArray(input)) {
    throw new PostsCreateValidationError('threadItems must be a JSON array.', 'INVALID_THREAD_ITEMS');
  }
  if (!input.length) throw new PostsCreateValidationError('threadItems cannot be empty.', 'INVALID_THREAD_ITEMS');

  return input.map((item, index) => {
    if (typeof item === 'string') {
      if (!item.trim()) {
        throw new PostsCreateValidationError(`threadItems[${index}] content cannot be empty.`, 'INVALID_THREAD_ITEMS');
      }
      return { content: item };
    }
    if (!isRecord(item) || Array.isArray(item)) {
      throw new PostsCreateValidationError(`threadItems[${index}] must be a string or object.`, 'INVALID_THREAD_ITEMS');
    }
    if (item.content !== undefined && typeof item.content !== 'string') {
      throw new PostsCreateValidationError(`threadItems[${index}].content must be a string.`, 'INVALID_THREAD_ITEMS');
    }
    if (item.mediaItems !== undefined && !Array.isArray(item.mediaItems)) {
      throw new PostsCreateValidationError(`threadItems[${index}].mediaItems must be an array.`, 'INVALID_THREAD_ITEMS');
    }
    const hasContent = typeof item.content === 'string' && item.content.trim().length > 0;
    const hasMediaItems = Array.isArray(item.mediaItems) && item.mediaItems.length > 0;
    if (!hasContent && !hasMediaItems) {
      throw new PostsCreateValidationError(
        `threadItems[${index}] must include content or mediaItems.`,
        'INVALID_THREAD_ITEMS',
      );
    }
    return { ...item };
  });
}

function splitThreadFile(raw: string): string[] {
  const items: string[] = [];
  let current: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (line.trim() === '---') {
      pushThreadFileItem(items, current);
      current = [];
    } else {
      current.push(line);
    }
  }
  pushThreadFileItem(items, current);
  return items;
}

function pushThreadFileItem(items: string[], lines: string[]): void {
  const content = lines.join('\n').trim();
  if (content) items.push(content);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
