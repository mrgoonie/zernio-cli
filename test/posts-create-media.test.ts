import { describe, expect, it } from 'vitest';
import { parseMediaJson, resolveMediaItems } from '../src/utils/posts-create-media.js';

describe('posts:create --media-json helper', () => {
  it('parses a JSON array of rich media items', () => {
    const items = parseMediaJson(
      '[{"type":"gif","url":"https://cdn.example/a.gif","altText":"hello"},{"url":"https://cdn.example/b.mp4","title":"clip"}]',
    );
    expect(items).toEqual([
      { type: 'gif', url: 'https://cdn.example/a.gif', altText: 'hello' },
      { type: 'video', url: 'https://cdn.example/b.mp4', title: 'clip' },
    ]);
  });

  it('returns undefined when omitted or empty', () => {
    expect(parseMediaJson(undefined)).toBeUndefined();
    expect(parseMediaJson('')).toBeUndefined();
  });

  it('throws PostsCreateValidationError on invalid JSON', () => {
    expect(() => parseMediaJson('{not json')).toThrow('--media-json must contain valid JSON');
  });

  it('throws when the root value is not an array', () => {
    expect(() => parseMediaJson('{"url":"https://cdn.example/a.png"}')).toThrow('--media-json must be a JSON array');
  });

  it('throws when an item is missing a url', () => {
    expect(() => parseMediaJson('[{"type":"image"}]')).toThrow('requires a non-empty "url" string');
  });

  it('throws when an item is not an object', () => {
    expect(() => parseMediaJson('["nope"]')).toThrow('must be an object with at least');
  });

  it('lets --media-json win when both media inputs are set', () => {
    const items = resolveMediaItems({
      mediaCsv: 'https://cdn.example/legacy.png',
      mediaJson: '[{"type":"document","url":"https://cdn.example/pdf.pdf","title":"whitepaper"}]',
    });
    expect(items).toEqual([{ type: 'document', url: 'https://cdn.example/pdf.pdf', title: 'whitepaper' }]);
  });

  it('falls back to the CSV --media list when --media-json is absent', () => {
    const items = resolveMediaItems({
      mediaCsv: 'https://cdn.example/a.png,https://cdn.example/b.mp4',
    });
    expect(items).toEqual([
      { type: 'image', url: 'https://cdn.example/a.png' },
      { type: 'video', url: 'https://cdn.example/b.mp4' },
    ]);
  });

  it('returns undefined when neither input is provided', () => {
    expect(resolveMediaItems({})).toBeUndefined();
  });

  it('falls back to CSV when --media-json is present but parses to an empty array', () => {
    const items = resolveMediaItems({ mediaCsv: 'https://cdn.example/a.png', mediaJson: '[]' });
    expect(items).toEqual([{ type: 'image', url: 'https://cdn.example/a.png' }]);
  });

  it('infers gif type from .gif extension via --media-json when type omitted', () => {
    const items = parseMediaJson('[{"url":"https://cdn.example/loop.gif"}]');
    expect(items).toEqual([{ type: 'gif', url: 'https://cdn.example/loop.gif' }]);
  });

  it('infers gif type from uppercase .GIF via CSV --media', () => {
    const items = resolveMediaItems({ mediaCsv: 'https://cdn.example/Loop.GIF' });
    expect(items).toEqual([{ type: 'gif', url: 'https://cdn.example/Loop.GIF' }]);
  });

  it('ignores query strings and fragments when detecting extensions', () => {
    const items = resolveMediaItems({
      mediaCsv: 'https://cdn.example/loop.gif?X-Amz-Signature=abc,https://cdn.example/clip.mp4#t=5',
    });
    expect(items).toEqual([
      { type: 'gif', url: 'https://cdn.example/loop.gif?X-Amz-Signature=abc' },
      { type: 'video', url: 'https://cdn.example/clip.mp4#t=5' },
    ]);
  });
});
