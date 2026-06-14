# Zernio API Surface

## Commands

`api:catalog` searches the generated OpenAPI catalog:

```bash
zernio api:catalog --search analytics --pretty
zernio api:catalog --tag "Google Business" --pretty
```

`api:describe` shows method, path, params, and body metadata:

```bash
zernio api:describe getPost --pretty
zernio api:describe "GET /v1/posts" --pretty
```

`api:call` sends one request:

```bash
zernio api:call getPost --path postId=post_123 --pretty
zernio api:call listPosts --query page=1 --query limit=10 --pretty
zernio api:call createPost --body-file ./post.json --dry-run --pretty
zernio api:call createPost --body-file ./post.json --request-id req_123 --pretty
zernio api:call createStandaloneAd --body-file ./ad.json --idempotency-key ad_req_123
zernio api:call uploadWhatsAppNumberKycDocument --header X-Filename=kyc.pdf --content-type application/octet-stream --raw-body-file ./kyc.pdf
```

## Input Flags

- `--path key=value`: path params
- `--query key=value`: query params
- `--header key=value`: request header
- `--body-json <json>`: inline JSON body
- `--body-file <file>`: JSON body from file
- `--raw-body-file <file>`: raw request body from file
- `--content-type <type>`: body content type override
- `--request-id <id>`: set `x-request-id`
- `--idempotency-key <key>`: set `Idempotency-Key`
- `--form key=value`: form field
- `--file key=/path`: multipart file field
- `--api-key <key>`: one-off API key, never printed
- `--base-url <url>`: one-off API base URL

## Boundary

Use `media:upload` for official media upload flow. Use `api:call` for single HTTP operations from the OpenAPI catalog.
