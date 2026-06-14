# Zernio Best Practices

## Output and Parsing

- JSON is default and stable for agents.
- Use `--pretty` only for human-readable reports.
- `api:call` returns `{ ok, status, statusText, rateLimit, data }`.
- Branch automation on structured API `type`, `code`, `status`, and IDs. Do not parse prose messages.
- Keep raw command output out of chat when it contains customer text, inbox messages, review text, private media URLs, or contact details.

## Auth and Config

- Prefer `ZERNIO_API_KEY` for agents and CI.
- Use `auth:login` only for local human browser sessions.
- Use `auth:set --key "$ZERNIO_API_KEY"` only when persistent local config is intended.
- The published CLI does not auto-load cwd `.env`; `ZERNIO_CLI_LOAD_ENV=1` is for explicit repo-local testing.
- Do not print API keys, bearer tokens, `~/.zernio/config.json`, `.env`, or generated presigned upload URLs.
- Saved config keys are protected from one-off custom hosts. For custom `--base-url`, pass a matching one-off `--api-key`.

## Command Selection

- Use curated commands for common tasks: posts, media, inbox, contacts, broadcasts, sequences, automations, analytics, profiles, accounts.
- Use `api:catalog` and `api:describe` when the user names an endpoint, tag, HTTP path, platform feature, ads, webhooks, WhatsApp setup, workflows, API keys, or GMB/Discord features.
- Use `api:call` for all unwrapped endpoints and exact OpenAPI bodies.
- Use `api:call` for complex update payloads when a curated update command is too narrow.
- Use `--dry-run` before mutating `api:call` in scripts or multi-step plans.

## Error Handling

- Treat `401/403` as auth/scope issues; run `doctor --connection` and verify profile/account access.
- Treat `404` as wrong ID or missing scope; rediscover IDs with list/get commands.
- Treat `409` as state conflict; refresh resource state before retrying.
- Treat `422` as payload/schema issue; run `api:describe` and inspect request body.
- Treat `429` as rate limited; respect `Retry-After`.
- Treat `5xx` and upstream `platform_error` as transient unless repeated.

## Rate Limits and Pagination

- Read `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After`.
- Back off before remaining hits zero.
- Use `limit`, `page`, `skip`, and `cursor` options instead of fetching everything.
- Prefer webhooks, cached account/profile lookups, and bulk endpoints for high-volume automation.
- Analytics endpoints can have separate caps; batch date ranges conservatively.

## Media

- Prefer `media:upload <file>` for normal images/videos/PDFs used in posts or messages.
- Validate file path and type before upload.
- Use returned `url` for post `--media` or JSON payload `mediaItems`.
- Use raw body endpoints only when OpenAPI says so, for example KYC document upload:
  ```bash
  zernio api:call uploadWhatsAppNumberKycDocument --header X-Filename=kyc.pdf --content-type application/octet-stream --raw-body-file ./kyc.pdf
  ```
- Do not expose private media URLs in reports.

## Queue Scheduling

- For auto-queue posts, send `queuedFromProfile` and optional `queueId` in `createPost`.
- Do not call `queue/next-slot` and copy the preview time into `scheduledFor`.
- Use explicit `scheduledAt` / `scheduledFor` only when the user asks for a fixed time.
- Include timezone when a human gives local-time intent.

## Platform and Content

- Use `platforms:list` for identifiers; use `https://docs.zernio.com/platforms` as current capability source.
- Use `platformSpecificData` in OpenAPI payloads for per-platform fields.
- Require title where platform needs it, especially YouTube, Reddit, Pinterest-style content.
- Check media and character constraints before posting multi-platform content.
- Do not assume platform support count is static; current CLI includes twitter, instagram, facebook, linkedin, tiktok, youtube, pinterest, reddit, bluesky, threads, googlebusiness, telegram, snapchat, whatsapp, discord.

## Messaging, Broadcasts, Automations

- Confirm recipient scope before sending broadcasts, enrolling sequences, or enabling automations.
- Use `broadcasts:recipients` and `automations:logs` to verify outcomes.
- For WhatsApp broadcasts, prefer templates; normal message text may not be allowed outside policy windows.
- Omit automation keywords only when the user explicitly wants all comments to trigger.
- Redact private message and contact content in summaries.
- Refuse spam, credential harvesting, evasion, or platform-policy bypass requests.

## Destructive Actions

- Ask for confirmation before `delete`, `cancel`, unsubscribe/block changes, broadcast sends, sequence activation, or automation activation when impact is broad.
- Use `get`/`list` first to show target IDs and current state.
- Prefer `--dry-run` for OpenAPI mutations before live calls.

## OpenAPI Freshness

- The CLI catalog is generated from bundled OpenAPI. If live docs add endpoints, refresh the spec and regenerate the catalog before claiming new coverage.
- Compare `zernio api:catalog --search <feature>` with `https://zernio.com/openapi.yaml` when coverage seems stale.
