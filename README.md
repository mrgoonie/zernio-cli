# Zernio CLI

Schedule posts, manage inbox, broadcasts, sequences, and automations across 14 platforms from the terminal.

Built for developers and AI agents. Outputs JSON by default.

## Install

```bash
npm install -g @zernio/cli
```

## Quick Start

```bash
# 1. Log in via browser (recommended)
zernio auth:login

# Or set your API key manually (get one at https://zernio.com/dashboard/api-keys)
zernio auth:set --key "sk_your-api-key"

# 2. List your accounts
zernio accounts:list --pretty

# 3. Schedule a post
zernio posts:create --text "Hello from the CLI!" --accounts <accountId> --scheduledAt "2025-06-01T10:00:00Z"

# Native X/Twitter quote, reply, and thread options
zernio posts:create \
  --text "Thread display title" \
  --accounts <twitterAccountId> \
  --threadJson '["tweet 1","tweet 2"]'

zernio posts:create \
  --text "my take" \
  --accounts <twitterAccountId> \
  --quoteTweetId "https://x.com/user/status/2061975910467698972"
```

## Authentication

### Browser login (recommended)

```bash
zernio auth:login
```

Opens your browser to authorize the CLI. An API key is created automatically and saved to `~/.zernio/config.json`. Running it again from the same device replaces the existing key.

Options:
- `--device-name <name>` - Custom device name for the API key label (defaults to your hostname)

### Manual API key

```bash
zernio auth:set --key "sk_your-api-key"
```

### Verify

```bash
zernio auth:check
```

## X/Twitter Post Options

`posts:create` supports native X/Twitter quote, reply, and thread fields through `platformSpecificData` on Twitter/X account targets.

```bash
zernio posts:create \
  --text "Thread display title" \
  --accounts <twitterAccountId> \
  --threadJson '["tweet 1","tweet 2"]'

zernio posts:create \
  --text "reply text" \
  --accounts <twitterAccountId> \
  --replyToTweetId "2061975910467698972"

zernio posts:create \
  --text "my take" \
  --accounts <twitterAccountId> \
  --quoteTweetId "https://x.com/user/status/2061975910467698972"
```

Use `--threadFile ./thread.txt` for `---` separated thread text, or pass advanced X/Twitter fields with `--platformSpecificData '{"replySettings":"following"}'`. When `threadItems` is present, top-level `--text` is retained as the Zernio post content/display text while the thread items define the actual X/Twitter thread.

For failed `posts:create` calls, add `--debug-safe` to print non-secret account/platform diagnostics.

## Commands

| Command | Description |
|---------|-------------|
| `zernio auth:login` | Log in via browser |
| `zernio auth:set --key <key>` | Save API key manually |
| `zernio auth:check` | Verify API key |
| `zernio profiles:list` | List profiles |
| `zernio profiles:create --name <name>` | Create profile |
| `zernio profiles:get <id>` | Get profile |
| `zernio profiles:update <id>` | Update profile |
| `zernio profiles:delete <id>` | Delete profile |
| `zernio accounts:list` | List social accounts |
| `zernio accounts:get <id>` | Get account details |
| `zernio accounts:health` | Check account health |
| `zernio posts:create` | Create/schedule a post |
| `zernio posts:list` | List posts |
| `zernio posts:get <id>` | Get post details |
| `zernio posts:delete <id>` | Delete a post |
| `zernio posts:retry <id>` | Retry failed post |
| `zernio analytics:posts` | Post analytics |
| `zernio analytics:daily` | Daily metrics |
| `zernio analytics:best-time` | Best posting times |
| `zernio media:upload <file>` | Upload media file |
| **Inbox** | |
| `zernio inbox:conversations` | List DM conversations |
| `zernio inbox:conversation <id>` | Get conversation details |
| `zernio inbox:messages <id>` | Get messages in conversation |
| `zernio inbox:send <id>` | Send a DM |
| `zernio inbox:comments` | List post comments |
| `zernio inbox:post-comments <id>` | Get comments on a post |
| `zernio inbox:reply <postId>` | Reply to a comment |
| `zernio inbox:reviews` | List reviews |
| `zernio inbox:review-reply <id>` | Reply to a review |
| **Contacts** | |
| `zernio contacts:list` | List contacts |
| `zernio contacts:create` | Create a contact |
| `zernio contacts:get <id>` | Get contact details |
| `zernio contacts:update <id>` | Update a contact |
| `zernio contacts:delete <id>` | Delete a contact |
| `zernio contacts:channels <id>` | List contact channels |
| `zernio contacts:set-field <id> <slug>` | Set custom field |
| `zernio contacts:clear-field <id> <slug>` | Clear custom field |
| `zernio contacts:bulk-create` | Bulk create from JSON |
| **Broadcasts** | |
| `zernio broadcasts:list` | List broadcasts |
| `zernio broadcasts:create` | Create broadcast draft |
| `zernio broadcasts:get <id>` | Get broadcast with stats |
| `zernio broadcasts:update <id>` | Update broadcast |
| `zernio broadcasts:delete <id>` | Delete broadcast |
| `zernio broadcasts:send <id>` | Send immediately |
| `zernio broadcasts:schedule <id>` | Schedule for later |
| `zernio broadcasts:cancel <id>` | Cancel broadcast |
| `zernio broadcasts:recipients <id>` | List recipients |
| `zernio broadcasts:add-recipients <id>` | Add recipients |
| **Sequences** | |
| `zernio sequences:list` | List sequences |
| `zernio sequences:create` | Create sequence |
| `zernio sequences:get <id>` | Get sequence with steps |
| `zernio sequences:update <id>` | Update sequence |
| `zernio sequences:delete <id>` | Delete sequence |
| `zernio sequences:activate <id>` | Activate sequence |
| `zernio sequences:pause <id>` | Pause sequence |
| `zernio sequences:enroll <id>` | Enroll contacts |
| `zernio sequences:unenroll <id> <contactId>` | Unenroll contact |
| `zernio sequences:enrollments <id>` | List enrollments |
| **Automations** | |
| `zernio automations:list` | List comment-to-DM automations |
| `zernio automations:create` | Create automation |
| `zernio automations:get <id>` | Get automation with logs |
| `zernio automations:update <id>` | Update automation |
| `zernio automations:delete <id>` | Delete automation |
| `zernio automations:logs <id>` | List trigger logs |

## Configuration

Config is stored at `~/.zernio/config.json`. Environment variables take precedence:

| Env Var | Description |
|---------|-------------|
| `ZERNIO_API_KEY` | API key (required) |
| `ZERNIO_API_URL` | Custom API base URL |

Legacy env vars `LATE_API_KEY` / `LATE_API_URL` and config at `~/.late/config.json` are still supported as fallbacks.

## AI Agent Integration

This CLI ships with a `SKILL.md` file for AI agent discovery (Claude Code, OpenClaw, etc.). AI agents can use the CLI to schedule posts, manage inbox conversations, send broadcasts, run drip sequences, and set up comment-to-DM automations programmatically.

## Supported Platforms

Instagram, TikTok, X (Twitter), LinkedIn, Facebook, Threads, YouTube, Bluesky, Pinterest, Reddit, Snapchat, Telegram, Google Business Profile.

## License

MIT
