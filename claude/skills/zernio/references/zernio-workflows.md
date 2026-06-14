# Zernio Workflows

## Auth

Use browser login for local human sessions:

```bash
zernio auth:login
zernio auth:check --pretty
```

Use env for agents and CI:

```bash
export ZERNIO_API_KEY="sk_..."
zernio doctor --connection --pretty
```

## Post With Media

```bash
zernio media:upload ./image.jpg --pretty
zernio posts:create \
  --text "Launch update" \
  --accounts <accountId> \
  --media "<url-from-upload>"
```

Media upload is a two-step server workflow: presign, upload direct to returned URL, then use returned public URL in post payload.

## Queue Scheduling

Use:

```bash
zernio api:call createPost \
  --body-json '{"content":"Queued","platforms":[{"platform":"twitter","accountId":"acc_123"}],"queuedFromProfile":"profile_123"}'
```

Optional `queueId` targets a specific queue. Do not use `next-slot` as `scheduledFor`; it is preview-only.

## Full API Calls

```bash
zernio api:catalog --tag Posts --pretty
zernio api:describe createPost --pretty
zernio api:call createPost --body-file ./post.json --pretty
```

Use `--dry-run` before mutating calls when building automation.

## Common Checks

```bash
zernio platforms:list --pretty
zernio accounts:health --pretty
zernio api:catalog --search webhook --pretty
```
