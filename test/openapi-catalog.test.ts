import { describe, expect, it } from 'vitest';
import {
  endpointSuggestions,
  endpointToSummary,
  findEndpoint,
  listEndpoints,
} from '../src/utils/openapi-catalog.js';

describe('OpenAPI catalog helpers', () => {
  it('finds endpoints by operationId', () => {
    const endpoint = findEndpoint('listPosts');

    expect(endpoint?.method).toBe('GET');
    expect(endpoint?.path).toBe('/v1/posts');
  });

  it('finds endpoints by method and path', () => {
    const endpoint = findEndpoint('POST /v1/posts');

    expect(endpoint?.operationId).toBe('createPost');
  });

  it('filters endpoints by tag and search text', () => {
    const endpoints = listEndpoints({ tag: 'Posts', search: 'retry', limit: 5 });

    expect(endpoints.map((endpoint) => endpoint.operationId)).toContain('retryPost');
  });

  it('filters endpoints by method and applies limits', () => {
    const endpoints = listEndpoints({ method: 'post', limit: 3 });

    expect(endpoints).toHaveLength(3);
    expect(endpoints.every((endpoint) => endpoint.method === 'POST')).toBe(true);
  });

  it('returns undefined for unknown endpoint input', () => {
    expect(findEndpoint('NOPE /v1/missing')).toBeUndefined();
    expect(findEndpoint('notARealOperation')).toBeUndefined();
  });

  it('returns suggestions and stable summaries', () => {
    const suggestions = endpointSuggestions('posts');
    const summary = endpointToSummary(suggestions[0]);

    expect(suggestions.length).toBeGreaterThan(0);
    expect(summary).toEqual({
      operationId: suggestions[0].operationId,
      method: suggestions[0].method,
      path: suggestions[0].path,
      tags: suggestions[0].tags,
      summary: suggestions[0].summary,
    });
  });
});
