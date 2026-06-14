import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareApiRequest, runApiRequest } from '../src/utils/api-request.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('prepareApiRequest', () => {
  it('applies path and query parameters', () => {
    const request = prepareApiRequest({
      apiKey: 'sk_test_secret',
      method: 'GET',
      path: '/v1/posts/{postId}',
      pathParams: { postId: 'post 123' },
      query: { include: 'analytics' },
    });

    expect(request.url).toBe('https://zernio.com/api/v1/posts/post%20123?include=analytics');
    expect((request.init.headers as Headers).get('authorization')).toBe('Bearer sk_test_secret');
  });

  it('builds JSON bodies', async () => {
    const request = prepareApiRequest({
      method: 'POST',
      path: '/v1/posts',
      body: { content: 'hello' },
    });

    expect((request.init.headers as Headers).get('content-type')).toBe('application/json');
    expect(request.init.body).toBe(JSON.stringify({ content: 'hello' }));
  });

  it('builds urlencoded form bodies', async () => {
    const request = prepareApiRequest({
      method: 'POST',
      path: '/v1/forms',
      form: { name: 'A B', enabled: 'true' },
    });

    expect((request.init.headers as Headers).get('content-type')).toBe('application/x-www-form-urlencoded');
    expect(String(request.init.body)).toBe('name=A+B&enabled=true');
  });

  it('builds multipart bodies with file and form fields', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'zernio-multipart-'));
    const filePath = join(dir, 'image.txt');
    writeFileSync(filePath, 'image bytes', 'utf-8');

    try {
      const request = prepareApiRequest({
        method: 'POST',
        path: '/v1/media',
        form: { purpose: 'post' },
        files: { file: filePath },
      });

      expect(request.init.body).toBeInstanceOf(FormData);
      expect((request.init.headers as Headers).has('content-type')).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('adds custom headers and raw file bodies', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'zernio-cli-'));
    const filePath = join(dir, 'kyc.pdf');
    writeFileSync(filePath, 'raw bytes', 'utf-8');

    try {
      const request = prepareApiRequest({
        apiKey: 'sk_test_secret',
        method: 'POST',
        path: '/v1/whatsapp/number/kyc-document',
        headers: { 'X-Filename': 'kyc.pdf', 'x-request-id': 'req_123' },
        rawBodyFile: filePath,
        contentType: 'application/octet-stream',
      });
      const headers = request.init.headers as Headers;

      expect(headers.get('x-filename')).toBe('kyc.pdf');
      expect(headers.get('x-request-id')).toBe('req_123');
      expect(headers.get('content-type')).toBe('application/octet-stream');
      expect(await (request.init.body as Blob).text()).toBe('raw bytes');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('throws for missing path parameters', () => {
    expect(() =>
      prepareApiRequest({
        method: 'GET',
        path: '/v1/posts/{postId}',
      }),
    ).toThrow('Missing path param "postId"');
  });

  it('rejects ambiguous body modes', () => {
    expect(() =>
      prepareApiRequest({
        method: 'POST',
        path: '/v1/posts',
        body: { content: 'hello' },
        form: { content: 'hello' },
      }),
    ).toThrow('Use only one body mode');
  });

  it('returns parsed response bodies and rate limit headers', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ items: [] }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-ratelimit-limit': '600',
          'x-ratelimit-remaining': '599',
          'x-ratelimit-reset': '1781412480',
        },
      },
    )));

    const result = await runApiRequest({
      apiKey: 'sk_test_secret',
      method: 'GET',
      path: '/v1/posts',
    });

    expect(result).toMatchObject({
      ok: true,
      status: 200,
      data: { items: [] },
      rateLimit: {
        limit: '600',
        remaining: '599',
        reset: '1781412480',
      },
    });
  });

  it('handles invalid JSON responses as null payloads', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not-json', {
      status: 502,
      headers: { 'content-type': 'application/json' },
    })));

    const result = await runApiRequest({
      apiKey: 'sk_test_secret',
      method: 'GET',
      path: '/v1/posts',
    });

    expect(result).toMatchObject({ ok: false, status: 502, data: null });
  });

  it('returns text responses when content is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('accepted', { status: 202 })));

    const result = await runApiRequest({
      apiKey: 'sk_test_secret',
      method: 'POST',
      path: '/v1/raw',
    });

    expect(result).toMatchObject({ ok: true, status: 202, data: 'accepted' });
  });

  it('treats invalid URLs as untrusted targets for saved keys', async () => {
    const { prepareApiRequest } = await import('../src/utils/api-request.js');

    expect(() =>
      prepareApiRequest({
        apiKey: 'sk_explicit',
        baseUrl: '::::',
        method: 'GET',
        path: '/v1/users',
      }),
    ).toThrow();
  });
});
