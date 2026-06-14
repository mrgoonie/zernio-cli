# Zernio Command Surface

Current target: `zernio-cli` 0.4.1+. JSON is default; add `--pretty` for humans.

## Agent/system commands

| Use case | Commands |
| --- | --- |
| Diagnose config/runtime | `zernio doctor`, `zernio doctor --connection` |
| List platform IDs | `zernio platforms:list` |
| Search full API | `zernio api:catalog [--tag <tag>] [--method GET] [--search <term>] [--limit 50]` |
| Inspect endpoint | `zernio api:describe <operationId>`, `zernio api:describe "GET /v1/posts"` |
| Call endpoint | `zernio api:call <operationId>` with flags below |

## Auth

| Use case | Commands |
| --- | --- |
| Browser/device login | `zernio auth:login [--device-name <name>]` |
| Save API key | `zernio auth:set --key "$ZERNIO_API_KEY" [--url https://zernio.com/api]` |
| Verify key | `zernio auth:check` |

Prefer `ZERNIO_API_KEY` for agents/CI. Never print the token.

## Profiles and Accounts

| Use case | Commands |
| --- | --- |
| Profile CRUD | `profiles:list`, `profiles:create --name <name> [--description --color]`, `profiles:get <id>`, `profiles:update <id> [--name --description --color --isDefault]`, `profiles:delete <id>` |
| Account discovery | `accounts:list [--profileId --platform]`, `accounts:get <id>`, `accounts:health [--profileId --platform --status]` |

Use profile/account IDs from these commands before posting, inbox, broadcasts, sequences, or automations.

## Posts, Analytics, Media

| Use case | Commands |
| --- | --- |
| Create/publish/schedule/draft | `posts:create --text <text> --accounts <ids> [--scheduledAt --draft --media --title --tags --hashtags --timezone --debug-safe]` |
| Native X/Twitter post options | `posts:create --accounts <twitterId> --text <display> [--quoteTweetId --replyToTweetId --replySettings --threadJson --threadFile --platformSpecificData]` |
| Post lifecycle | `posts:list [--profileId --status --platform --from --to --page --limit]`, `posts:get <id>`, `posts:delete <id>`, `posts:retry <id>` |
| Analytics | `analytics:posts [--profileId --platform --postId --source --from --to --sortBy --order --page --limit]`, `analytics:daily [--profileId --platform --from --to]`, `analytics:best-time [--profileId --platform]` |
| Media upload | `media:upload <file>` |

Use `media:upload` for normal post media. It handles presign + direct upload and returns the public URL.

## Inbox, Comments, Reviews

| Use case | Commands |
| --- | --- |
| DM conversations | `inbox:conversations [--profileId --accountId --platform --status --sortOrder --limit --cursor]`, `inbox:conversation <id> --accountId <id>` |
| DM messages | `inbox:messages <conversationId> --accountId <id>`, `inbox:send <conversationId> --accountId <id> --message <text> [--mediaUrl <url>]` |
| Comments | `inbox:comments [--profileId --accountId --platform --since --sortBy --limit --cursor]`, `inbox:post-comments <postId> --accountId <id>`, `inbox:reply <postId> --accountId <id> --message <text> [--commentId <id>]` |
| Reviews | `inbox:reviews [--profileId --accountId --platform --hasReply --minRating --maxRating --sortBy --sortOrder --limit --cursor]`, `inbox:review-reply <reviewId> --accountId <id> --message <text>` |

Treat customer message bodies as private. Redact in reports unless user explicitly asks and has access.

## Contacts and Custom Fields

| Use case | Commands |
| --- | --- |
| Contact CRUD | `contacts:list [--profileId --search --tag --platform --isSubscribed --limit --skip]`, `contacts:create --profileId <id> --name <name> [--email --company --tags --accountId --platform --platformIdentifier]`, `contacts:get <id>`, `contacts:update <id> [--name --email --company --tags --isSubscribed --isBlocked --notes]`, `contacts:delete <id>` |
| Channels | `contacts:channels <id>` |
| Custom fields | `contacts:set-field <id> <slug> --value <value>`, `contacts:clear-field <id> <slug>` |
| Bulk import | `contacts:bulk-create --profileId <id> --accountId <id> --platform <platform> --file ./contacts.json` |

Bulk file must be a JSON array of contact objects.

## Broadcasts, Sequences, Automations

| Use case | Commands |
| --- | --- |
| Broadcast lifecycle | `broadcasts:list [--profileId --status --platform --limit --skip]`, `broadcasts:create --profileId <id> --accountId <id> --platform <platform> --name <name> [--message --templateName --templateLanguage]`, `broadcasts:get <id>`, `broadcasts:update <id> [--name --message]`, `broadcasts:delete <id>` |
| Broadcast sending | `broadcasts:add-recipients <id> [--contactIds --phones --useSegment]`, `broadcasts:send <id>`, `broadcasts:schedule <id> --scheduledAt <iso>`, `broadcasts:cancel <id>`, `broadcasts:recipients <id> [--status --limit --skip]` |
| Sequence lifecycle | `sequences:list [--profileId --status --limit --skip]`, `sequences:create --profileId <id> --accountId <id> --platform <platform> --name <name> [--stepsFile --exitOnReply --exitOnUnsubscribe]`, `sequences:get <id>`, `sequences:update <id> [--name --stepsFile --exitOnReply --exitOnUnsubscribe]`, `sequences:delete <id>`, `sequences:activate <id>`, `sequences:pause <id>` |
| Sequence enrollment | `sequences:enroll <id> --contactIds <ids> [--channelIds <ids>]`, `sequences:unenroll <id> <contactId>`, `sequences:enrollments <id> [--status --limit --skip]` |
| Comment-to-DM automation | `automations:list [--profileId]`, `automations:create --profileId <id> --accountId <id> --platformPostId <id> --name <name> --dmMessage <text> [--postId --postTitle --keywords --matchMode --commentReply]`, `automations:get <id>`, `automations:update <id> [--name --keywords --matchMode --dmMessage --commentReply --isActive]`, `automations:delete <id>`, `automations:logs <id> [--status --limit --skip]` |

For complex update payloads, prefer `api:describe updateBroadcast`, `api:describe updateSequence`, then `api:call ... --body-file`.

## Generic OpenAPI Caller

The bundled OpenAPI catalog covers 383 operations, 255 paths, 49 tags.

```bash
zernio api:catalog --tag Posts --pretty
zernio api:describe createPost --pretty
zernio api:call listPosts --query page=1 --query limit=20 --pretty
zernio api:call createPost --body-file ./post.json --dry-run --pretty
zernio api:call createStandaloneAd --body-file ./ad.json --idempotency-key ad_req_123
zernio api:call uploadWhatsAppNumberKycDocument --header X-Filename=kyc.pdf --content-type application/octet-stream --raw-body-file ./kyc.pdf
```

Flags:

- `--path key=value`: path param, repeatable
- `--query key=value`: query param, repeatable
- `--header key=value`: request header, repeatable
- `--body-json <json>` / `--body-file <file>`: JSON request body
- `--raw-body-file <file>` / `--content-type <type>`: raw/octet-stream body
- `--form key=value` / `--file key=/path`: form or multipart body
- `--request-id <id>` / `--idempotency-key <key>`: safe retry headers
- `--api-key <key>` / `--base-url <url>`: one-off target override
- `--dry-run`: preview method, URL, headers, and body presence without sending

Tags: API Keys, Account Groups, Account Settings, Accounts, Ad Audiences, Ad Campaigns, Ads, Analytics, Broadcasts, Comment Automations, Comments, Connect, Contacts, Custom Fields, Discord, GMB Attributes, GMB Food Menus, GMB Location Details, GMB Media, GMB Place Actions, GMB Reviews, GMB Services, GMB Verifications, Inbox Analytics, Instagram, Invites, LinkedIn Mentions, Logs, Media, Messages, Posts, Profiles, Queue, Reddit Search, Reviews, Sequences, Tracking Tags, Twitter Engagement, Usage, Users, Validate, Webhooks, WhatsApp, WhatsApp Calling, WhatsApp Flows, WhatsApp Phone Numbers, WhatsApp Sandbox, WhatsApp Templates, Workflows.
