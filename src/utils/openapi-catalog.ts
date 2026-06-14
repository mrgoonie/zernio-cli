import { openApiEndpoints, type OpenApiEndpoint } from '../generated/openapi-catalog.js';

export function listEndpoints(filters: {
  tag?: string;
  method?: string;
  search?: string;
  limit?: number;
}): OpenApiEndpoint[] {
  const tag = filters.tag?.toLowerCase();
  const method = filters.method?.toUpperCase();
  const search = filters.search?.toLowerCase();
  const limit = filters.limit ?? 50;

  return openApiEndpoints
    .filter((endpoint) => {
      if (tag && !endpoint.tags.some((value) => value.toLowerCase() === tag)) return false;
      if (method && endpoint.method !== method) return false;
      if (!search) return true;
      const haystack = [
        endpoint.operationId,
        endpoint.method,
        endpoint.path,
        endpoint.summary,
        'description' in endpoint ? endpoint.description : undefined,
        endpoint.tags.join(' '),
      ].join(' ').toLowerCase();
      return haystack.includes(search);
    })
    .slice(0, limit);
}

export function findEndpoint(input: string): OpenApiEndpoint | undefined {
  const normalized = input.trim();
  const byId = openApiEndpoints.find(
    (endpoint) => endpoint.operationId.toLowerCase() === normalized.toLowerCase(),
  );
  if (byId) return byId;

  const match = normalized.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(.+)$/i);
  if (!match) return undefined;

  const method = match[1].toUpperCase();
  const path = match[2].trim();
  return openApiEndpoints.find((endpoint) => endpoint.method === method && endpoint.path === path);
}

export function endpointSuggestions(input: string): OpenApiEndpoint[] {
  const search = input.toLowerCase();
  return openApiEndpoints
    .filter((endpoint) => {
      const values = [endpoint.operationId, endpoint.path, endpoint.summary, endpoint.tags.join(' ')]
        .join(' ')
        .toLowerCase();
      return values.includes(search);
    })
    .slice(0, 8);
}

export function endpointToSummary(endpoint: OpenApiEndpoint) {
  return {
    operationId: endpoint.operationId,
    method: endpoint.method,
    path: endpoint.path,
    tags: endpoint.tags,
    summary: endpoint.summary,
  };
}
