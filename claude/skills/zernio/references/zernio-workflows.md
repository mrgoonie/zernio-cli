# Zernio Workflows

Use these flows as recipes. Replace IDs with values from discovery commands.

## Setup and Health

```bash
zernio auth:login --device-name "$(hostname)"
zernio auth:check --pretty
zernio doctor --connection --pretty
zernio platforms:list --pretty
```

For CI/agents:

```bash
export ZERNIO_API_KEY="sk_..."
zernio doctor --connection --pretty
```

## Discover Workspace IDs

```bash
zernio profiles:list --pretty
zernio accounts:list --profileId <profileId> --pretty
zernio accounts:health --profileId <profileId> --pretty
```

When ambiguous, always ask the user which profile/account to use. Do not guess between client brands.

## Profile Lifecycle

```bash
zernio profiles:create --name "Client A" --description "Launch workspace" --color "#2563eb"
zernio profiles:update <profileId> --name "Client A Social" --isDefault false
zernio profiles:get <profileId> --pretty
zernio profiles:delete <profileId>
```

Delete only after explicit confirmation.

## Create Posts

Publish now:

```bash
zernio posts:create --text "Hello from Zernio" --accounts <accountId>
```

Schedule:

```bash
zernio posts:create \
  --text "Launch update" \
  --accounts <accountId1>,<accountId2> \
  --scheduledAt "2026-06-20T09:00:00Z" \
  --timezone "America/New_York"
```

Draft:

```bash
zernio posts:create --text "Draft copy" --accounts <accountId> --draft
```

Track/retry:

```bash
zernio posts:list --status failed --limit 20 --pretty
zernio posts:get <postId> --pretty
zernio posts:retry <postId> --pretty
```

## Upload Media Then Post

```bash
zernio media:upload ./image.jpg --pretty
zernio posts:create \
  --text "Launch update" \
  --accounts <accountId> \
  --media "<public-url-from-upload>"
```

For non-post upload endpoints or raw binary endpoints, use `api:call --raw-body-file`.

## Queue Scheduling

Let Zernio assign the queue slot:

```bash
zernio api:call createPost \
  --body-json '{"content":"Queued post","platforms":[{"platform":"twitter","accountId":"acc_123"}],"queuedFromProfile":"profile_123"}' \
  --request-id req_queue_001 \
  --pretty
```

Optional `queueId` targets a queue. Do not feed `queue/next-slot` into `scheduledFor`; that endpoint is preview-only.

## Analytics

```bash
zernio analytics:posts --profileId <profileId> --from "2026-06-01" --to "2026-06-14" --pretty
zernio analytics:daily --platform instagram --pretty
zernio analytics:best-time --profileId <profileId> --platform linkedin --pretty
```

For endpoint-specific metrics such as demographics or ad analytics:

```bash
zernio api:catalog --tag Analytics --search demographics --pretty
zernio api:describe getInstagramDemographics --pretty
zernio api:call getInstagramDemographics --query accountId=<accountId> --pretty
```

## Inbox, Comments, Reviews

```bash
zernio inbox:conversations --platform instagram --limit 20 --pretty
zernio inbox:messages <conversationId> --accountId <accountId> --pretty
zernio inbox:send <conversationId> --accountId <accountId> --message "Thanks for reaching out"
```

```bash
zernio inbox:comments --accountId <accountId> --limit 20 --pretty
zernio inbox:post-comments <postId> --accountId <accountId> --pretty
zernio inbox:reply <postId> --accountId <accountId> --commentId <commentId> --message "Thank you"
```

```bash
zernio inbox:reviews --platform googlebusiness --minRating 1 --maxRating 3 --pretty
zernio inbox:review-reply <reviewId> --accountId <accountId> --message "Thanks for the feedback"
```

## Contacts and CRM

```bash
zernio contacts:list --search "john" --tag vip --pretty
zernio contacts:create --profileId <profileId> --name "John Doe" --email john@example.com
zernio contacts:update <contactId> --tags "vip,lead" --isSubscribed true
zernio contacts:channels <contactId> --pretty
zernio contacts:set-field <contactId> lifecycle_stage --value lead
zernio contacts:clear-field <contactId> lifecycle_stage
```

Bulk import:

```bash
zernio contacts:bulk-create --profileId <profileId> --accountId <accountId> --platform instagram --file ./contacts.json
```

## Broadcasts

Direct message broadcast:

```bash
zernio broadcasts:create \
  --profileId <profileId> \
  --accountId <accountId> \
  --platform instagram \
  --name "Launch" \
  --message "We just launched"
zernio broadcasts:add-recipients <broadcastId> --contactIds <id1>,<id2>
zernio broadcasts:send <broadcastId>
```

WhatsApp template broadcast:

```bash
zernio broadcasts:create \
  --profileId <profileId> \
  --accountId <accountId> \
  --platform whatsapp \
  --name "Order update" \
  --templateName order_confirmation \
  --templateLanguage en
zernio broadcasts:schedule <broadcastId> --scheduledAt "2026-06-20T10:00:00Z"
zernio broadcasts:recipients <broadcastId> --status delivered --pretty
```

## Sequences

```bash
zernio sequences:create \
  --profileId <profileId> \
  --accountId <accountId> \
  --platform instagram \
  --name "Welcome Series" \
  --stepsFile ./steps.json
zernio sequences:activate <sequenceId>
zernio sequences:enroll <sequenceId> --contactIds <contactId1>,<contactId2>
zernio sequences:enrollments <sequenceId> --status active --pretty
zernio sequences:pause <sequenceId>
```

Use `stepsFile` for multi-step JSON. Prefer `api:call updateSequence --body-file` for complex edits.

## Comment-to-DM Automations

```bash
zernio automations:create \
  --profileId <profileId> \
  --accountId <accountId> \
  --platformPostId <platformPostId> \
  --name "Lead Magnet" \
  --keywords "info,details,link" \
  --matchMode contains \
  --dmMessage "Here is the link you asked for" \
  --commentReply "Check your DMs"
```

```bash
zernio automations:update <automationId> --isActive false
zernio automations:logs <automationId> --status sent --pretty
```

Omit `--keywords` only when the user explicitly wants every comment to trigger.

## Advanced API Use Cases

Use `api:*` for ads, webhooks, WhatsApp phone numbers/templates/flows/calling, workflows, usage, API keys, account groups, GMB, Discord, validation, and any endpoint not wrapped by curated commands.

```bash
zernio api:catalog --tag Ads --search campaign --pretty
zernio api:describe createStandaloneAd --pretty
zernio api:call createStandaloneAd --body-file ./ad.json --idempotency-key ad_req_123 --pretty
```

```bash
zernio api:catalog --tag Webhooks --pretty
zernio api:describe createWebhookSettings --pretty
zernio api:call createWebhookSettings --body-file ./webhook.json --pretty
```

```bash
zernio api:catalog --tag Workflows --pretty
zernio api:call triggerWorkflow --path workflowId=<workflowId> --body-file ./workflow-trigger.json --pretty
```

## Dry Run Before Mutation

```bash
zernio api:call createPost --body-file ./post.json --dry-run --pretty
```

Confirm method, URL, path params, and body presence before removing `--dry-run`.
