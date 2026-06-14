# zernio-cli

Unofficial, agent-friendly CLI for the Zernio API.

This package keeps the existing human workflow commands (`posts:create`, `media:upload`, `inbox:*`, etc.) and adds generated OpenAPI discovery plus a generic authenticated API caller for full API coverage.

Official Zernio SDK/docs remain the source of truth:
- API docs: https://docs.zernio.com/
- OpenAPI: [docs/openapi/zernio-api-openapi.yaml](docs/openapi/zernio-api-openapi.yaml)
- Node SDK: https://github.com/zernio-dev/zernio-node

## Install

```bash
npm install -g zernio-cli
```

The binary is `zernio`. A deprecated `late` alias remains for compatibility.

## Auth

```bash
# Browser login for local interactive use
zernio auth:login

# API key for CI/headless use
zernio auth:set --key "sk_your-api-key"

# Or use env
export ZERNIO_API_KEY="sk_your-api-key"

# Verify without printing secrets
zernio doctor --connection --pretty
```

Config resolution:
1. One-off flags where supported, such as `--api-key` and `--base-url`
2. `ZERNIO_API_KEY`, `ZERNIO_API_URL`
3. `~/.zernio/config.json`
4. Deprecated fallbacks: `LATE_*`, `~/.late/config.json`

The published CLI does not auto-load `.env` from the current directory. For local repo testing, opt in explicitly:

```bash
ZERNIO_CLI_LOAD_ENV=1 zernio doctor --connection --pretty
ZERNIO_CLI_LOAD_ENV=1 ZERNIO_CLI_ENV_FILE=.env npm test
```

## Common Workflows

```bash
# List profiles and accounts
zernio profiles:list --pretty
zernio accounts:list --pretty

# Upload media, then use returned public URL in a post
zernio media:upload ./photo.jpg --pretty
zernio posts:create \
  --text "Launch update" \
  --accounts <accountId1>,<accountId2> \
  --media "https://public-url-from-upload" \
  --scheduledAt "2026-06-20T09:00:00Z"

# Queue scheduling: let Zernio assign the slot
zernio api:call createPost \
  --body-json '{"content":"Queued post","platforms":[{"platform":"twitter","accountId":"acc_123"}],"queuedFromProfile":"profile_123"}'
```

Do not call `queue/next-slot` and feed that time back into `scheduledFor`; the docs define `next-slot` as preview-only.

## Full API Coverage

The CLI generates a compact endpoint catalog from the bundled OpenAPI spec.

```bash
# Search endpoints
zernio api:catalog --tag Posts --search retry --pretty

# Inspect parameters/request body shape
zernio api:describe createPost --pretty
zernio api:describe "GET /v1/posts" --pretty

# Call any endpoint
zernio api:call getPost --path postId=post_123 --pretty
zernio api:call listPosts --query limit=10 --query page=1 --pretty
zernio api:call createPost --body-file ./post.json --dry-run --pretty
zernio api:call createPost --body-file ./post.json --request-id req_123 --pretty
zernio api:call listPinterestBoardsForSelection --header X-Connect-Token=conn_123 --pretty
zernio api:call uploadWhatsAppNumberKycDocument \
  --header X-Filename=passport.pdf \
  --content-type application/octet-stream \
  --raw-body-file ./passport.pdf
```

`api:call` returns:

```json
{
  "ok": true,
  "status": 200,
  "statusText": "OK",
  "rateLimit": {
    "limit": "600",
    "remaining": "599",
    "reset": "1760000000",
    "retryAfter": null
  },
  "data": {}
}
```

For media uploads, prefer `zernio media:upload`; it implements the official presign + direct PUT workflow.

## Reliability Rules

- JSON is default; use `--pretty` for readable JSON.
- Branch automation on error `type` and `code` when the API returns them, not message text.
- Respect `Retry-After` and `X-RateLimit-*` headers.
- Use `--request-id` or `--idempotency-key` for mutating calls that document safe retry headers.
- Use pagination, caching, webhooks, and bulk endpoints for automation.
- Use `platformSpecificData` for per-platform post settings.
- Check current platform support at https://docs.zernio.com/platforms instead of relying on a fixed count.

## Development

```bash
npm ci
npm run generate:openapi
npm run build
npm test
npm run test:coverage
npm audit --omit=optional

# Optional live connection test using repo .env
ZERNIO_CLI_LOAD_ENV=1 node dist/index.js doctor --connection --pretty
```

Release policy:
- `main`: stable npm/GitHub release
- `dev`: beta prerelease
- semantic-release generates versions and changelog from conventional commits

## License

MIT
