# Zernio Best Practices

## Output

- JSON is default and stable enough for agents.
- Use `--pretty` only when a human reads output.
- `api:call` returns `{ ok, status, statusText, rateLimit, data }`.

## Errors

- Branch on API `type` and `code`, not message text.
- Treat `429` as backoff; respect `Retry-After`.
- Treat upstream `platform_error` 4xx as caller-fixable.
- Treat API 5xx or 502 as transient unless repeated.

## Rate Limits

- Read `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`.
- Back off before remaining hits zero.
- Use pagination, caching, webhooks, and bulk endpoints.
- Analytics endpoints can have separate per-second caps.

## Platform Settings

- Use `platformSpecificData` for platform-specific payloads.
- Keep per-platform constraints near examples.
- Link to https://docs.zernio.com/platforms for current capabilities.

## Security

- Never echo API keys or Authorization headers.
- Do not store secrets in docs, issues, PR bodies, or generated logs.
- Redact request bodies if they contain customer message text or private URLs.
