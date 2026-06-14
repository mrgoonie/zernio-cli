import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { resolveConfig } from './config.js';

export interface ApiRequestOptions {
  apiKey?: string;
  baseUrl?: string;
  method: string;
  path: string;
  headers?: Record<string, string>;
  pathParams?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  form?: Record<string, string>;
  files?: Record<string, string>;
  rawBodyFile?: string;
  contentType?: string;
}

export interface PreparedApiRequest {
  url: string;
  init: RequestInit;
}

const DEFAULT_BASE_URL = 'https://zernio.com/api';

export function prepareApiRequest(options: ApiRequestOptions): PreparedApiRequest {
  const resolved = resolveConfig();
  const config = resolved.config;
  const baseUrl = (options.baseUrl || config.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const baseUrlSource = options.baseUrl ? 'option:base-url' : resolved.sources.baseUrl || 'default';
  const apiKey = options.apiKey || config.apiKey;
  const apiKeySource = options.apiKey ? 'option:api-key' : resolved.sources.apiKey;

  assertTrustedCredentialTarget(baseUrl, apiKeySource, baseUrlSource);

  const path = applyPathParams(options.path, options.pathParams || {});
  const url = new URL(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`);

  for (const [key, value] of Object.entries(options.query || {})) {
    url.searchParams.set(key, value);
  }

  const headers = new Headers();
  if (apiKey) headers.set('Authorization', `Bearer ${apiKey}`);
  for (const [key, value] of Object.entries(options.headers || {})) headers.set(key, value);

  const hasFiles = Boolean(options.files && Object.keys(options.files).length > 0);
  const hasFormOnly = Boolean(!hasFiles && options.form && Object.keys(options.form).length > 0);
  const hasJson = options.body !== undefined;
  const hasRaw = Boolean(options.rawBodyFile);
  const bodyModes = [hasFiles, hasFormOnly, hasJson, hasRaw].filter(Boolean).length;
  if (bodyModes > 1) throw new Error('Use only one body mode: --file/--form, --body-json/--body-file, or --raw-body-file.');

  let body: BodyInit | undefined;
  if (hasFiles) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(options.form || {})) formData.set(key, value);
    for (const [key, filePath] of Object.entries(options.files || {})) {
      const bytes = readFileSync(filePath);
      formData.set(key, new Blob([bytes]), basename(filePath));
    }
    body = formData;
  } else if (hasFormOnly) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options.form || {})) params.set(key, value);
    setContentType(headers, options.contentType || 'application/x-www-form-urlencoded');
    body = params;
  } else if (hasJson) {
    setContentType(headers, options.contentType || 'application/json');
    body = JSON.stringify(options.body);
  } else if (hasRaw && options.rawBodyFile) {
    const bytes = readFileSync(options.rawBodyFile);
    setContentType(headers, options.contentType || 'application/octet-stream');
    body = new Blob([bytes]);
  }

  return {
    url: url.toString(),
    init: {
      method: options.method,
      headers,
      body,
    },
  };
}

export async function runApiRequest(options: ApiRequestOptions) {
  const request = prepareApiRequest(options);
  const response = await fetch(request.url, request.init);
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text();

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    rateLimit: {
      limit: response.headers.get('x-ratelimit-limit'),
      remaining: response.headers.get('x-ratelimit-remaining'),
      reset: response.headers.get('x-ratelimit-reset'),
      retryAfter: response.headers.get('retry-after'),
    },
    data: payload,
  };
}

function applyPathParams(path: string, params: Record<string, string>): string {
  return path.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const value = params[key];
    if (value === undefined) throw new Error(`Missing path param "${key}". Pass --path ${key}=...`);
    return encodeURIComponent(value);
  });
}

function setContentType(headers: Headers, contentType: string): void {
  if (!headers.has('content-type')) headers.set('Content-Type', contentType);
}

function assertTrustedCredentialTarget(
  baseUrl: string,
  apiKeySource: string | undefined,
  baseUrlSource: string,
): void {
  if (apiKeySource !== 'config-file') return;
  if (isTrustedZernioUrl(baseUrl)) return;
  if (baseUrlSource === 'config-file') return;

  throw new Error(
    'Refusing to send a saved API key to a custom API URL. Pass --api-key with --base-url, or save both values with zernio auth:set.',
  );
}

function isTrustedZernioUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'zernio.com' || url.hostname.endsWith('.zernio.com'));
  } catch {
    return false;
  }
}
