# CLI Reference

## Output

All commands output JSON by default. Use `--pretty` for indented JSON.

Generic API calls return:

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

Errors use JSON and never include secrets:

```json
{"ok":false,"error":true,"message":"No API key configured.","status":401}
```

## Agent-Friendly Commands

| Command | Purpose |
| --- | --- |
| `zernio doctor` | Redacted config and runtime diagnostics |
| `zernio doctor --connection` | Verify API connectivity without printing secrets |
| `zernio platforms:list` | Platform identifiers plus docs source |
| `zernio api:catalog` | Search generated OpenAPI catalog |
| `zernio api:describe <operation>` | Inspect endpoint params and body metadata |
| `zernio api:call <operation>` | Call any endpoint from the catalog |

## Generic API Caller

```bash
zernio api:call listPosts --query limit=10
zernio api:call getPost --path postId=post_123
zernio api:call createPost --body-file ./post.json
zernio api:call createPost --body-file ./post.json --request-id req_123
zernio api:call createStandaloneAd --body-file ./ad.json --idempotency-key ad_req_123
zernio api:call uploadWhatsAppNumberKycDocument --header X-Filename=kyc.pdf --content-type application/octet-stream --raw-body-file ./kyc.pdf
zernio api:call "GET /v1/posts" --query page=1 --query limit=20
```

Options:
- `--path key=value` path parameter, repeatable
- `--query key=value` query parameter, repeatable
- `--header key=value` request header, repeatable; dry-run redacts non-trivial values
- `--body-json <json>` JSON request body
- `--body-file <file>` JSON request body file
- `--raw-body-file <file>` raw request body file
- `--content-type <type>` body content type override
- `--request-id <id>` set `x-request-id` for endpoints that document safe retries
- `--idempotency-key <key>` set `Idempotency-Key` for endpoints that document safe retries
- `--form key=value` form field, repeatable
- `--file key=/path` multipart file field, repeatable
- `--dry-run` print URL/body presence without sending
- `--api-key <key>` one-off secret override, never printed
- `--base-url <url>` one-off API base URL override

The CLI refuses to send a saved `~/.zernio/config.json` key to a custom non-Zernio API URL unless that URL was also saved in config. For one-off custom hosts, pass both `--api-key` and `--base-url`.

## Auth Commands

```bash
zernio auth:login
zernio auth:set --key "sk_..."
zernio auth:check
```

For automation, prefer `ZERNIO_API_KEY`. For local use, `auth:login` is easier.

The global CLI does not automatically load cwd `.env` files. In this repository, use `ZERNIO_CLI_LOAD_ENV=1` for explicit local test runs.

## Media

```bash
zernio media:upload ./photo.jpg
```

The command implements Zernio's two-step upload: presign, direct PUT, then return public URL. Use that URL in `posts:create` or `api:call createPost`.

## Queue Scheduling

Use `queuedFromProfile` and optional `queueId` in create-post payloads. Do not use `queue/next-slot` as the scheduled time; it is preview-only.

## Release Channels

- `main` publishes stable releases.
- `dev` publishes beta prereleases.
- Version bumps and changelog are generated from conventional commits.
