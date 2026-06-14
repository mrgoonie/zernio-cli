import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseJsonInput, parseKeyValueList, toArray } from '../src/utils/argument-parsing.js';

describe('argument parsing helpers', () => {
  it('normalizes scalar, array, null, and undefined values', () => {
    expect(toArray(undefined)).toEqual([]);
    expect(toArray(null)).toEqual([]);
    expect(toArray('one')).toEqual(['one']);
    expect(toArray(['one', 2])).toEqual(['one', '2']);
  });

  it('parses repeatable key=value options', () => {
    expect(parseKeyValueList(['limit=10', 'q=hello=world'])).toEqual({
      limit: '10',
      q: 'hello=world',
    });
  });

  it('rejects invalid key=value options', () => {
    expect(() => parseKeyValueList(['missing-equals'])).toThrow('Expected key=value');
    expect(() => parseKeyValueList([' =value'])).toThrow('Expected non-empty key');
  });

  it('parses JSON from inline strings and files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'zernio-json-'));
    const filePath = join(dir, 'payload.json');
    writeFileSync(filePath, '{"ok":true}', 'utf8');

    try {
      expect(parseJsonInput('{"name":"inline"}')).toEqual({ name: 'inline' });
      expect(parseJsonInput(undefined, filePath)).toEqual({ ok: true });
      expect(parseJsonInput()).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects ambiguous JSON sources', () => {
    expect(() => parseJsonInput('{}', 'payload.json')).toThrow('Use either --body-json or --body-file');
  });
});
